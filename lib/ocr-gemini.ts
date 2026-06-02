import { GoogleGenerativeAI } from "@google/generative-ai";

// Two prompts: one for "answer" (student work — excludes the problem statement),
// one for "problem" (the question itself — keeps every word).
const ANSWER_PROMPT = `You transcribe handwritten mathematics into LaTeX. Return ONLY:
{ "lines": ["<line 1 LaTeX>", "<line 2 LaTeX>", ...] }

CRITICAL rules:
- One JSON entry per visually distinct line.
- Output PROPER LaTeX with explicit parentheses and \\backslash commands:
    sin(x^2) → \\sin(x^2)    cos(2x+1) → \\cos(2x+1)
    1/2 → \\frac{1}{2}        sqrt(x+1) → \\sqrt{x+1}
    integral 3x dx → \\int 3x \\, dx
    sum from i=1 → \\sum_{i=1}^{n}    lim x->0 → \\lim_{x \\to 0}
- ALWAYS use parentheses to disambiguate. "sin x^2" → "\\sin(x^2)", not "\\sin x^{2}".
- This is the STUDENT'S WORK only. Do NOT include the problem statement.
- If the page is empty, return {"lines": []}.
- NEVER output \\frac{X}{} or truncated expressions; use \\frac{X}{?} or (?) if unreadable.

Strict JSON only. No prose, no markdown fences.`;

const PROBLEM_PROMPT = `You transcribe a math PROBLEM STATEMENT from an image. Return ONLY:
{ "lines": ["<the full problem text>"] }

Rules:
- Include EVERY word of the problem, even non-math words like "Solve", "Differentiate", "Evaluate", "Find", etc.
- Use plain readable notation when convenient: x^2 is fine, you don't need \\frac unless the source is a fraction.
- Strip leading question numbers like "1.", "2.", "Q1:" — return just the problem itself.
- If there are multiple problems on the page, join them with spaces into one entry.
- If the image is unreadable or empty, return {"lines": []}.

Strict JSON only. No prose, no markdown fences.`;

const PRIMARY_MODEL  = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(modelId: string, apiKey: string, pngBuffer: Buffer, mode: "answer" | "problem") {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  });
  const prompt = mode === "problem" ? PROBLEM_PROMPT : ANSWER_PROMPT;
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: "image/png", data: pngBuffer.toString("base64") } },
  ]);
  return result.response.text();
}

function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|UNAVAILABLE|overloaded|high demand|429/i.test(msg);
}

export async function ocrViaGemini(pngBuffer: Buffer, mode: "answer" | "problem" = "answer"): Promise<{ lines: string[]; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const plan: { model: string; delayBefore: number }[] = [
    { model: PRIMARY_MODEL,  delayBefore: 0 },
    { model: PRIMARY_MODEL,  delayBefore: 1500 },
    { model: FALLBACK_MODEL, delayBefore: 0 },
  ];

  let lastErr: unknown;
  let usedModel = PRIMARY_MODEL;
  let text = "";
  for (const step of plan) {
    if (step.delayBefore > 0) await sleep(step.delayBefore);
    try {
      text = await callGemini(step.model, apiKey, pngBuffer, mode);
      usedModel = step.model;
      lastErr = undefined;
      break;
    } catch (e) {
      lastErr = e;
      if (!isOverloaded(e)) break;
    }
  }
  if (lastErr) throw lastErr;

  let parsed: { lines?: unknown };
  try { parsed = JSON.parse(text); } catch { parsed = { lines: [] }; }
  const lines = Array.isArray(parsed.lines)
    ? parsed.lines
        .map((x) => String(x).trim())
        .filter(Boolean)
        // Strip stray markdown fences if the model still emits them
        .map((l) => l.replace(/^```(?:latex|math)?|```$/g, "").trim())
    : [];
  return { lines, model: usedModel };
}
