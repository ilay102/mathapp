import { NextResponse } from "next/server";
import { z } from "zod";
import { deepseek, MODELS, assertKey } from "@/lib/deepseek";

export const runtime = "nodejs";

const BodySchema = z.object({
  problem: z.string().min(1),
  technique: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  language: z.enum(["en", "he"]).optional().default("en"),
  n: z.number().int().min(1).max(8).optional().default(3),
});

export async function POST(req: Request) {
  try {
    assertKey();
    const body = BodySchema.parse(await req.json());
    const langDirective = body.language === "he"
      ? "Write the problem text in Hebrew (עברית). Math expressions stay in LaTeX."
      : "Write the problem text in English.";
    const system = `You are a calculus / physics professor. Given ONE problem the student got wrong, generate ${body.n} ANALOGOUS practice problems that drill the SAME technique. Vary parameters, functions, or values — keep the underlying skill identical.

${langDirective}

Each generated problem must be:
- Solvable in 1-5 steps with the same technique.
- Self-contained (no reference to "the previous problem").
- Phrased like a textbook question.
- Increasing in difficulty over the list (easy → harder).

Return STRICT JSON:
{
  "problems": [
    { "problem": "<question text>", "expectedTechnique": "<same as the original or a close cousin>", "difficulty": "easy" | "medium" | "hard" }
  ]
}`;

    const user = [
      `Original problem: ${body.problem}`,
      body.domain ? `Domain: ${body.domain}` : "",
      body.technique ? `Technique to drill: ${body.technique}` : "",
      `Generate exactly ${body.n} problems.`,
    ].filter(Boolean).join("\n");

    const completion = await deepseek.chat.completions.create({
      model: MODELS.flash,
      temperature: 0.7, // a bit of variety
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: { problems?: Array<{ problem: string; expectedTechnique?: string; difficulty?: string }> };
    try { parsed = JSON.parse(raw); } catch { parsed = { problems: [] }; }
    const problems = Array.isArray(parsed.problems) ? parsed.problems.filter((p) => p.problem) : [];
    return NextResponse.json({ ok: true, problems });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
