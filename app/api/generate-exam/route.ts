import { NextResponse } from "next/server";
import { z } from "zod";
import { deepseek, MODELS, assertKey } from "@/lib/deepseek";

export const runtime = "nodejs";

const BodySchema = z.object({
  topic: z.enum(["calculus", "linear_algebra", "diffeq", "physics"]),
  n: z.number().int().min(1).max(10).optional().default(3),
  language: z.enum(["en", "he"]).optional().default("en"),
});

export async function POST(req: Request) {
  try {
    assertKey();
    const body = BodySchema.parse(await req.json());
    const langDirective = body.language === "he"
      ? "Write ALL question prose in Hebrew (עברית). Mathematical expressions in LaTeX stay in standard format."
      : "Write all question prose in English.";

    const systemPrompt = `You are an engineering math and physics professor designing an exam.
Generate exactly ${body.n} university-level exam questions on the topic "${body.topic.toUpperCase()}".

${langDirective}

The questions should:
- range from basic application to challenging engineering problems.
- be mathematically precise, clear, and solvable.
- be self-contained.

Return a STRICT JSON response:
{
  "questions": [
    {
      "id": "<random 4-character alphanumeric string>",
      "problem": "<question text with LaTeX equations in $...$ or $$...$$>",
      "expectedTechnique": "<standard technique name>",
      "points": <points allocated e.g., 20, 25, 33>
    }
  ]
}`;

    const completion = await deepseek.chat.completions.create({
      model: MODELS.flash,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate the mock exam on ${body.topic}.` },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: { questions?: any[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { questions: [] };
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    return NextResponse.json({ ok: true, questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
