import { NextResponse } from "next/server";
import { ocrViaGemini } from "@/lib/ocr-gemini";

export const runtime = "nodejs";

const OCR_BASE = process.env.OCR_BASE_URL || "http://127.0.0.1:7800";
const OCR_PROVIDER = (process.env.OCR_PROVIDER || "auto").toLowerCase(); // "gemini" | "pix2text" | "auto"

async function ocrViaPix2Text(file: File): Promise<{ lines: string[] }> {
  const upstream = new FormData();
  upstream.append("file", file, file.name || "page.png");
  const headers: Record<string, string> = {};
  if (process.env.OCR_TOKEN) headers["authorization"] = `Bearer ${process.env.OCR_TOKEN}`;
  // Pix2Text first-call model load can exceed Node fetch's 5min default — be patient.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 240_000);
  let res: Response;
  try {
    res = await fetch(`${OCR_BASE}/ocr`, { method: "POST", body: upstream, headers, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Pix2Text ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { lines?: string[] };
  return { lines: json.lines ?? [] };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const modeRaw = String(formData.get("mode") ?? "answer").toLowerCase();
    const mode: "answer" | "problem" = modeRaw === "problem" ? "problem" : "answer";
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing file" }, { status: 400 });
    }

    const hasGemini = !!process.env.GEMINI_API_KEY;
    const wantsGemini =
      OCR_PROVIDER === "gemini" || (OCR_PROVIDER === "auto" && hasGemini);

    if (wantsGemini) {
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await ocrViaGemini(buf, mode);
      return NextResponse.json({ ok: true, provider: `gemini:${result.model}`, mode, lines: result.lines });
    }

    // Try Pix2Text sidecar
    try {
      const result = await ocrViaPix2Text(file);
      return NextResponse.json({ ok: true, provider: "pix2text", ...result });
    } catch (sidecarErr) {
      const sidecarMsg = sidecarErr instanceof Error ? sidecarErr.message : String(sidecarErr);
      const looksUnreachable =
        sidecarMsg.includes("ECONNREFUSED") || sidecarMsg === "fetch failed";
      if (looksUnreachable && hasGemini) {
        const buf = Buffer.from(await file.arrayBuffer());
        const result = await ocrViaGemini(buf, mode);
        return NextResponse.json({ ok: true, provider: `gemini-fallback:${result.model}`, mode, lines: result.lines });
      }
      const hint = looksUnreachable
        ? ` Pix2Text sidecar unreachable at ${OCR_BASE}. Set GEMINI_API_KEY in .env.local to use Gemini Flash OCR instead (no Python needed).`
        : "";
      return NextResponse.json(
        { ok: false, error: sidecarMsg + hint },
        { status: 502 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
