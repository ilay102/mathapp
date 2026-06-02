# Paste this as the FIRST message in a new Claude chat

---

I'm continuing work on **MathPad** — an AI engineering-study tutor (handwritten math grader + practice + tools).

**Live in production:** https://mathapp-chi.vercel.app  
**GitHub:** https://github.com/ilay102/mathapp  
**Local path:** `C:\Users\ilay1\OneDrive\מסמכים\reels\claude\mathapp`

## What's already built and shipped (don't redo)

- **Grader brain**: DeepSeek V4 Flash. Finds ALL mistakes per solution, marks exact wrong sub-snippet, returns corrected line, 3-level hints, domain + technique tags, final answer, worked solution, INTERMEDIATE-STEP rule. Eval: 15/15 (100%) on the regression suite.
- **OCR**: Gemini 2.5 Flash vision (no Python sidecar needed in prod). Retries + fallback to flash-lite.
- **Interactive function graph**: pan/zoom (capped), hover crosshair, student-vs-correct overlay, auto-annotated zeros/extrema (top-5 sorted), integral shading.
- **Multi-part questions** (a)(b)(c) with shared context between parts.
- **Hebrew + English UI**, RTL-aware.
- **Practice mode** with `/api/similar` + Leitner spaced-repetition deck.
- **Mock exam simulator** at `/exams` with timer + grading report.
- **Analytics dashboard** at `/dashboard`.
- **Engineering tools** at `/tools`: Matrix calc, Vector calc, Complex numbers, Unit converter.
- **Real notebook paper styling**: `.notebook-textarea` and `.notebook-page` CSS classes (off-white #fffdf7, red left margin, blue ruled lines every 32px, Caveat cursive font).
- **Supabase auth** with `dataService.ts` unifying logged-in (Supabase) + guest (localStorage) flows, auto-merging on sign-in.
- **Cost guards**: 24h response cache + IP-based daily quota (anon), localhost bypass.
- **SymPy `/equiv` endpoint** (Python sidecar) for algebraic-equivalence promotion (`cos(2x) ≡ 1−2sin²x` → "wrong" auto-promoted to "correct").
- **Unit Engine** — `lib/units.ts` with 7D dimensional algebra + 80 unit DB + `UnitTag.tsx` pill component + grader prompt UNIT-AWARE rule. All Mars-Climate-Orbiter-class tests pass. UI integration handed to Antigravity (see R4 handoff).

## Handoff docs in the repo (read these for context, in order)

1. `HANDOFF_TO_ANTIGRAVITY.md` — round 1 bug list (all fixed)
2. `HANDOFF_TO_ANTIGRAVITY_R3.md` — what's still missing after Antigravity round 2 (N1–N6 + F1–F8)
3. `HANDOFF_TO_ANTIGRAVITY_R4_UNITS.md` — full UI integration spec for the Unit Engine (U1–U7)
4. `ROADMAP.md` — original 4-phase vision

## What I want to work on next (pick one, or I'll tell you when you ask)

Sorted by impact:

**P0 fixes still pending (from R3 handoff):**
- N1 math palette also in write mode
- N2 Question field needs visual edit cue
- N3 sticky pen toolbar on mobile/fullscreen
- N4 real eraser tool (currently only "Clear")
- N5 verify stroke persistence actually restores on reload
- N6 Live Preview renders math (currently plain text)

**Unit Engine UI integration (R4 handoff):**
- U1 render UnitTag pills in CheckResult
- U2 render UnitTag pills in Live Preview
- U3 Units + Constants tabs in math palette
- U4 wire `UnitConverter.tsx` to `lib/units.ts`
- U5 alt-units row in result panel (J ↔ Wh ↔ eV)
- U6 inline ✓/✗ dimensional check dot
- U7 dynamic refactoring (downstream values recompute on edit)

**Bigger engineering features:**
- Riemann sum visualizer
- Slope fields for ODEs / vector fields for E&M
- 3D surface plots (verify Antigravity's `Graph3D.tsx` actually works)
- Voice input for math
- PDF homework import (drop a problem set PDF, auto-split into exercises)
- Hot keys (Ctrl+/, Ctrl+\, Ctrl+N, Ctrl+Z for canvas undo)
- Live KaTeX preview under every textarea
- Per-exercise PDF export

**Production hardening:**
- Replace in-memory rate-limit with Upstash Redis (free tier)
- Add Sentry for error monitoring
- CI: wire `eval/full-test.mjs` into GitHub Actions

## Conventions / workflow

- **Test workflow**: bring up dev with `npm run dev` (port 3010), then `node eval/run.mjs` (15 single-line) → `node eval/full-test.mjs` (16 image→OCR→grade) → `node eval/hard-test.mjs`. Pass ≥95% before shipping any grader change.
- **Build check**: `rm -rf .next && npm run build` mirrors Vercel's strict checks (TS errors that `tsc --noEmit` misses).
- **Deploy**: push to `main`, Vercel auto-rebuilds in ~2 min.
- **Cost rule**: cheapest model that works. DeepSeek + Gemini Flash only. Aggressive prompt caching.
- **Eval gate**: any grader prompt change → re-run `eval/run.mjs` first thing.
- **Hebrew throughout**: anything user-facing goes through `lib/i18n.ts`. RTL via `dir="auto"`.
- **The user prefers**: cheap models (no Claude in the stack); no key-rotation lectures; honest "what works / what's faking it" assessments over hype.

## My starting question for you

Read `HANDOFF_TO_ANTIGRAVITY_R3.md` and `HANDOFF_TO_ANTIGRAVITY_R4_UNITS.md` from the repo. Then tell me honestly what state the app is in, and which one item from those lists you think has the highest ratio of (engineering-student value) to (your effort to ship it). Don't just summarize — pick one and start.
