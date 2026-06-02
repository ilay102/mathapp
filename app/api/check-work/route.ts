import { NextResponse } from "next/server";
import { z } from "zod";
import { deepseek, MODELS, assertKey } from "@/lib/deepseek";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { checkEquivalent } from "@/lib/equiv";

export const runtime = "nodejs";

const BodySchema = z.object({
  problem: z.string().min(1),
  studentLines: z.array(z.string()).min(1),
  pageId: z.string().uuid().optional(),
  language: z.enum(["en", "he"]).optional().default("en"),
});

const SYSTEM_PROMPT = `You are a university-level calculus tutor (אינפי 1/2) grading a student's solution.

INTERNAL PROCESS (do this silently, then return JSON):
1. Identify domain & technique (chain rule? u-substitution? L'Hopital? induction?).
2. SOLVE the problem yourself from scratch to a canonical final answer.
3. Compare the student's work line-by-line against any valid path to that answer.
4. Catalog EVERY mistake — don't stop at the first one.

CALCULUS RULES YOU MUST APPLY (the cheat sheet you grade against):

Derivatives
- Chain rule: $\\frac{d}{dx} f(g(x)) = f'(g(x)) \\cdot g'(x)$ — the inner derivative is non-negotiable.
- Product rule: $(fg)' = f'g + fg'$ — TWO terms.
- Quotient rule: $\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}$ — numerator order matters.
- $\\frac{d}{dx}[\\sin x] = \\cos x$, $\\frac{d}{dx}[\\cos x] = -\\sin x$ (SIGN!), $\\frac{d}{dx}[\\tan x] = \\sec^2 x$.
- $\\frac{d}{dx}[e^x] = e^x$, $\\frac{d}{dx}[\\ln x] = \\frac{1}{x}$ (for $x > 0$), $\\frac{d}{dx}[a^x] = a^x \\ln a$.
- Implicit differentiation: treat $y$ as $y(x)$; every $y$-derivative emits $\\frac{dy}{dx}$.

Integrals
- $\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C$ for $n \\ne -1$.
- $\\int \\frac{1}{x} \\, dx = \\ln|x| + C$ — absolute value bars are required for the general antiderivative.
- $\\int e^x \\, dx = e^x + C$. $\\int a^x \\, dx = \\frac{a^x}{\\ln a} + C$.
- $\\int \\sin x \\, dx = -\\cos x + C$ (SIGN!), $\\int \\cos x \\, dx = \\sin x + C$.
- u-substitution: $u = g(x), du = g'(x)dx$ — the $du$ must match what's IN the integrand.
- Integration by parts: $\\int u\\,dv = uv - \\int v\\,du$. Pick $u$ via LIATE (log, inverse trig, alg, trig, exp).
- The "$+ C$" is required on every indefinite integral.

Limits
- L'Hôpital applies ONLY to $\\frac{0}{0}$ or $\\frac{\\infty}{\\infty}$. Never to $\\frac{c}{0}$ for finite $c \\ne 0$.
- Standard limits: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$, $\\lim_{x \\to 0} \\frac{1 - \\cos x}{x^2} = \\frac{1}{2}$, $\\lim_{x \\to \\infty} (1 + 1/x)^x = e$.

Series
- Geometric: $\\sum_{n=0}^{\\infty} ar^n = \\frac{a}{1-r}$ iff $|r| < 1$.
- p-series $\\sum 1/n^p$ converges iff $p > 1$.

Multivariable
- $\\frac{\\partial f}{\\partial x}$: differentiate treating $y$ as a CONSTANT. Watch the chain rule — $\\frac{\\partial}{\\partial x} \\sin(xy) = y \\cos(xy)$, the $y$ factor is REQUIRED.
- Gradient $\\nabla f = (f_x, f_y, f_z)$. Directional derivative $D_{\\vec{u}} f = \\nabla f \\cdot \\hat{u}$ (unit vector!).

Linear algebra
- Matrix multiplication is NOT commutative: $AB \\ne BA$ in general.
- $\\det(AB) = \\det(A) \\det(B)$. $\\det(A^{-1}) = 1/\\det(A)$. $A$ is invertible iff $\\det(A) \\ne 0$.
- $2\\times 2$ det: $\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc$ (SIGN!).
- Eigenvalues: solve $\\det(A - \\lambda I) = 0$ (characteristic polynomial). For each $\\lambda$, solve $(A - \\lambda I)\\vec{v} = 0$ for eigenvectors.
- Row operations: $R_i \\to R_i + cR_j$ preserves determinant. $R_i \\leftrightarrow R_j$ flips sign. $R_i \\to cR_i$ scales det by $c$.
- Rank-nullity: $\\dim(\\ker A) + \\dim(\\mathrm{im} A) = n$ (columns of $A$).
- Inner product / dot product: $\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta$. Orthogonal iff dot is $0$.

Differential equations
- Separable: $\\frac{dy}{dx} = f(x)g(y)$ → $\\int \\frac{dy}{g(y)} = \\int f(x)\\, dx + C$. Final answer needs initial condition applied.
- First-order linear: $y' + P(x)y = Q(x)$. Integrating factor $\\mu = e^{\\int P\\, dx}$, then $(\\mu y)' = \\mu Q$.
- Second-order linear homogeneous w/ constant coeffs $ay'' + by' + cy = 0$: characteristic $a r^2 + br + c = 0$. Roots → $e^{rx}$ basis (distinct real), $e^{rx}, xe^{rx}$ (repeated), $e^{\\alpha x}\\cos(\\beta x), e^{\\alpha x}\\sin(\\beta x)$ (complex $\\alpha \\pm \\beta i$).
- Always check whether the IC was applied (drop the $C$).

Physics (calculus-level)
- Kinematics (1D, constant $a$): $v = v_0 + at$, $x = x_0 + v_0 t + \\frac{1}{2}at^2$, $v^2 = v_0^2 + 2a(x - x_0)$.
- Force: $\\vec{F} = m\\vec{a}$. Always tag vector quantities as vectors.
- Energy: $KE = \\frac{1}{2}mv^2$. Gravitational $PE = mgh$. Spring $PE = \\frac{1}{2}kx^2$. Work-energy: $W_{net} = \\Delta KE$.
- Momentum: $\\vec{p} = m\\vec{v}$, conserved when $\\vec{F}_{ext} = 0$. Elastic collisions ALSO conserve KE.
- Circular motion: centripetal $a_c = v^2/r$ pointing INWARD.
- Simple harmonic: $\\omega = \\sqrt{k/m}$ (spring) or $\\sqrt{g/L}$ (pendulum, small angle). $T = 2\\pi/\\omega$.
- UNITS matter — if the student drops units in a numeric final answer, flag as notation error.

Proof technique
- Induction: BASE case + INDUCTIVE step ($P(k) \\Rightarrow P(k+1)$). The inductive step must show $P(k+1)$ explicitly, no hand-waving.
- A "verification" that uses the thing you're proving is CIRCULAR and counts as wrong (errorType: logic).

GRADING RULES:
- A line is WRONG only if no valid mathematical derivation can produce it from the lines above OR the problem. Multiple solution paths are valid.
- Be conservative: <70% confidence → omit the error.
- Cascade tracking: if line N is wrong AND a later line M follows mechanically from N, mark M with inheritsFromLine: N.
- An UNFINISHED solution (correct so far but doesn't reach an answer) → status "incomplete", errors describe what's missing.
- A solution missing "$+ C$" on indefinite integrals or "$\\ln|x|$" without absolute values → flag as notation error (still wrong).
- A "proof" that assumes the conclusion (circular) → logic error.

OUTPUT RULES:
- wrongSnippet: EXACT byte-for-byte substring of student input — do NOT translate Unicode (x², ½, ÷) to LaTeX. Copy verbatim. Null if whole line.
- correctedLine: PURE LaTeX (no $ delimiters) — UI renders via KaTeX.
- finalAnswer: what the correct final answer should be (PURE LaTeX, no $ delimiters). Even for proofs, give the conclusion to verify.
- technique: the standard name of the method that solves this problem.
- ALL math in hints (l1, l2, l3) MUST be wrapped in $...$ inline or $$...$$ display.
- graphExpr (optional, PURE JS-friendly math): if the problem involves a single-variable function f(x) — derivative, integral over an interval, limit, max/min, intersection, plotting — return the EXPRESSION (no leading "f(x) =") of the function being studied OR of the correct answer if it's a function, using JS syntax: 2*x*cos(x^2) not 2x\\cos(x²). Allowed funcs: sin, cos, tan, exp, log, ln, sqrt, abs. Pi/e: pi, e. Pick the most pedagogical curve (often the derivative for derivative problems). Omit when the problem is purely algebraic, a number, a system, a matrix, a proof, etc.
- graphRange (optional): [xMin, xMax] for the plot. Default to [-5, 5] if not obvious.
- studentExpr (optional): if the student's FINAL answer is itself a wrong function expression (e.g. they wrote f'(x) = cos(x^2) instead of 2x*cos(x^2)), return their wrong expression in the same JS-friendly format. The UI overlays it on the same graph in red so the student SEES the difference. Null if the student's wrong answer is not a graphable function.
- workedSolution: the textbook-quality step-by-step canonical solve. Use this even when the student is correct (so they can compare). Each step has a LaTeX "math" expression and a short "explain" sentence (Hebrew if language is "he"). Aim for 3-7 steps. Steps should be small enough that a stuck student can follow each derivation. ALL math in "math" is PURE LaTeX (no $); ALL math in "explain" is wrapped in $...$.
- integralRange (optional): [a, b] only when the problem is a definite integral ∫_a^b f(x) dx — the UI will shade that area under the graph.

Return STRICT JSON:
{
  "status": "correct" | "wrong" | "incomplete" | "unreadable",
  "confidence": number,
  "domain": "derivatives" | "integrals" | "limits" | "series" | "multivariable" | "diffeq" | "linalg" | "algebra" | "proof" | "physics" | "other",
  "technique": string,
  "finalAnswer": string,
  "graphExpr": string | null,
  "graphRange": [number, number] | null,
  "studentExpr": string | null,
  "integralRange": [number, number] | null,
  "workedSolution": [ { "math": string, "explain": string } ] | null,
  "errors": [
    {
      "lineIndex": number,
      "errorType": "algebra" | "calculus" | "logic" | "notation" | "arithmetic" | "other",
      "wrongSnippet": string | null,
      "correctedLine": string,
      "inheritsFromLine": number | null,
      "hints": { "l1": string, "l2": string, "l3": string }
    }
  ],
  "uncertainty": string | null
}`;

const FREE_DAILY_CAP = 3;
const PRO_DAILY_CAP = 25;

const ipCache = new Map<string, { count: number; day: string }>();
const checksCache = new Map<string, { result: any; expiresAt: number }>();

function checkIpLimit(ip: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const cached = ipCache.get(ip);
  if (!cached || cached.day !== today) {
    ipCache.set(ip, { count: 1, day: today });
    return true;
  }
  if (cached.count >= FREE_DAILY_CAP) {
    return false;
  }
  cached.count += 1;
  return true;
}

function getCachedResult(problem: string, studentLines: string[]): any | null {
  const hash = problem.trim() + ":::" + studentLines.map((l) => l.trim()).join("\n");
  const cached = checksCache.get(hash);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  return null;
}

function setCachedResult(problem: string, studentLines: string[], result: any) {
  const hash = problem.trim() + ":::" + studentLines.map((l) => l.trim()).join("\n");
  checksCache.set(hash, {
    result,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    assertKey();
    const body = BodySchema.parse(await req.json());

    // Try cache first
    const cached = getCachedResult(body.problem, body.studentLines);
    if (cached) {
      return NextResponse.json({ ok: true, result: cached, cached: true, latency_ms: Date.now() - t0 });
    }

    let userId: string | null = null;
    if (supabaseConfigured) {
      const sb = await createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        userId = user.id;
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        const { count } = await sb
          .from("checks")
          .select("id", { count: "exact", head: true })
          .eq("owner", user.id)
          .gte("created_at", since.toISOString());
        const cap = FREE_DAILY_CAP;
        if ((count ?? 0) >= cap) {
          return NextResponse.json(
            { ok: false, error: `Daily free limit reached (${cap}/day). Upgrade to Pro for ${PRO_DAILY_CAP}/day.` },
            { status: 429 },
          );
        }
      } else {
        // Enforce IP limit for non-logged-in/anonymous users
        const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
        if (!checkIpLimit(ip)) {
          return NextResponse.json(
            {
              ok: false,
              error: `Daily free limit reached (${FREE_DAILY_CAP}/day) for anonymous users. Please sign in to get more checks and save your notebooks!`,
            },
            { status: 429 },
          );
        }
      }
    } else {
      // Offline mode or no Supabase: enforce local IP limit
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      if (!checkIpLimit(ip)) {
        return NextResponse.json(
          { ok: false, error: `Daily free limit reached (${FREE_DAILY_CAP}/day) in guest mode.` },
          { status: 429 },
        );
      }
    }

    const langDirective = body.language === "he"
      ? "\nLANGUAGE: Hebrew. Write ALL prose in hints (l1, l2, l3) and the uncertainty field in Hebrew (עברית). Math expressions in LaTeX stay exactly as-is (\\sin, \\frac, etc.). Technical math terms may be in Hebrew (נגזרת, אינטגרל, כלל השרשרת) or kept in English — whichever is clearer."
      : "\nLANGUAGE: English. Write all prose in English.";
    const userContent = [
      langDirective,
      "",
      `Problem:\n${body.problem}`,
      "",
      "Student work, one line per array entry:",
      ...body.studentLines.map((l, i) => `[${i}] ${l}`),
    ].join("\n");

    const completion = await deepseek.chat.completions.create({
      model: MODELS.flash,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        status: "unreadable",
        confidence: 0,
        errors: [],
        uncertainty: "AI returned malformed output. Please try again.",
      };
    }

    if (typeof parsed.confidence === "number" && parsed.confidence > 1) {
      parsed.confidence = Math.min(1, parsed.confidence / 100);
    }
    if (!Array.isArray(parsed.errors)) parsed.errors = [];
    if (parsed.status === "correct") parsed.errors = [];
    // Surface metadata even if the model omitted some field.
    if (typeof parsed.domain !== "string") parsed.domain = null;
    if (typeof parsed.technique !== "string") parsed.technique = null;
    if (typeof parsed.finalAnswer !== "string") parsed.finalAnswer = null;
    if (typeof parsed.graphExpr !== "string") parsed.graphExpr = null;
    if (!Array.isArray(parsed.graphRange) || parsed.graphRange.length !== 2) parsed.graphRange = null;
    if (typeof parsed.studentExpr !== "string") parsed.studentExpr = null;
    if (!Array.isArray(parsed.integralRange) || parsed.integralRange.length !== 2) parsed.integralRange = null;
    if (!Array.isArray(parsed.workedSolution)) parsed.workedSolution = null;

    // ---- SymPy post-validation: if the grader said "wrong" but the student's final
    // answer is algebraically equivalent to the canonical one, override to "correct".
    // Only attempts the check if both expressions exist and the sidecar is reachable.
    if (parsed.status === "wrong" && typeof parsed.finalAnswer === "string" && typeof parsed.studentExpr === "string") {
      const equiv = await checkEquivalent(parsed.finalAnswer, parsed.studentExpr);
      if (equiv === true) {
        parsed.status = "correct";
        parsed.errors = [];
        parsed.uncertainty = (parsed.uncertainty ?? "") +
          " (SymPy confirms your answer is algebraically equivalent — promoted from 'wrong' to 'correct'.)";
        parsed.equivalentOverride = true;
      }
    }

    // Back-compat: synthesize legacy fields the existing UI may still read.
    const errs = parsed.errors as Array<{ lineIndex?: number; errorType?: string; wrongSnippet?: string | null; correctedLine?: string; hints?: { l1: string; l2: string; l3: string } }>;
    if (errs.length > 0) {
      const first = errs[0];
      parsed.firstErrorLineIndex = first.lineIndex ?? null;
      parsed.errorType = first.errorType ?? null;
      parsed.wrongSnippet = first.wrongSnippet ?? null;
      parsed.correctedLine = first.correctedLine ?? null;
      parsed.hints = first.hints ?? null;
    } else {
      parsed.firstErrorLineIndex = null;
      parsed.errorType = null;
      parsed.wrongSnippet = null;
      parsed.correctedLine = null;
      parsed.hints = null;
    }

    const latency_ms = Date.now() - t0;

    if (userId && body.pageId && supabaseConfigured) {
      try {
        const sb = await createClient();
        await sb.from("checks").insert({
          page_id: body.pageId,
          owner: userId,
          problem: body.problem,
          student_lines: body.studentLines,
          result: parsed,
          model: MODELS.flash,
          latency_ms,
        });
      } catch {
        /* persistence failure shouldn't block the response */
      }
    }

    setCachedResult(body.problem, body.studentLines, parsed);

    return NextResponse.json({ ok: true, result: parsed, latency_ms });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
