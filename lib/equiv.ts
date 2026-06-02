/**
 * Server-side helper: ask the Python sidecar (SymPy) if two expressions are
 * algebraically equivalent. Used as a post-validation layer: if the LLM grader
 * says "wrong" but SymPy says student's final answer equals the canonical one,
 * we promote the verdict back to "correct" (or at least flag low confidence).
 *
 * Times out fast — if the sidecar is down we just return null.
 */
const SIDECAR = process.env.OCR_BASE_URL || "http://127.0.0.1:7800";

export async function checkEquivalent(a: string, b: string, timeoutMs = 4000): Promise<boolean | null> {
  if (!a || !b) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.OCR_TOKEN) headers["authorization"] = `Bearer ${process.env.OCR_TOKEN}`;
    const res = await fetch(`${SIDECAR}/equiv`, {
      method: "POST",
      headers,
      body: JSON.stringify({ a, b }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; equivalent?: boolean };
    if (json.ok === false) return null;
    return !!json.equivalent;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
