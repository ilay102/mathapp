# MathPad → the perfect engineering-study environment

A handoff doc. Written to be picked up by another coding agent (e.g. Google Antigravity) or a human dev.
Two lenses throughout: **(S) what an engineering student actually needs** and **(D) what a senior dev must build/fix**.

---

## 0. TL;DR — where we really are

MathPad today is a **single-user, local-only, calculus/physics homework checker** that works impressively well at its core job (find where you went wrong, show how to fix it) but is **not yet a "study environment"** and **not deployed**.

The grading brain is genuinely strong. Everything around it (accounts, content, exam prep, collaboration, durability) is thin or missing.

---

## 1. Honest status — what works, what's shaky, what's fake

### ✅ Actually works (tested via eval harness, 60+ cases)
- **Grader brain** — DeepSeek V4 Flash. Finds ALL mistakes per solution, marks the exact wrong line + sub-snippet, returns corrected line, 3-level progressive hints, domain + technique tags, final answer. ~97% on our labeled set.
- **OCR** — Gemini 2.5 Flash vision. Clean LaTeX from printed + "handwriting-font" images, multi-line, retry+fallback to flash-lite on 503. (⚠ NOT tested with a real stylus on a real tablet — see risks.)
- **Worked solution** — step-by-step canonical solve, reveal-on-tap.
- **Interactive function graph** — pan/zoom/hover readout, student-vs-correct overlay, zeros/max/min annotations, definite-integral shading.
- **Multi-part questions** (a)(b)(c) with shared context between parts.
- **Subject rules baked into the prompt** — calc (chain/product/quotient, u-sub, IBP, L'Hôpital), multivariable, linear algebra, ODEs, physics (kinematics/energy/momentum/SHM/units), proofs (induction, circular-reasoning detection).
- **SymPy equivalence checker** (Python sidecar `/equiv`) — promotes false "wrong" → "correct" when answers are algebraically equal (cos2x ≡ 1−2sin²x).
- **Practice mode** — `/api/similar` generates analogous problems; Leitner spaced-repetition deck at `/practice`.
- **Hebrew + English**, RTL-aware.

### 🟡 Shaky / half-built (exists but not trustworthy)
- **Persistence is localStorage only.** Notebook lives in the browser. Clear cache = lose everything. No cross-device sync. **This is the #1 thing that makes it not a real product.**
- **Supabase auth + `/notebooks` route exist but are ORPHANED** — the actual notebook UI (`app/page.tsx`) never reads/writes Supabase. Two disconnected persistence systems.
- **Free-tier quota** only enforced when a Supabase user is logged in — which the notebook never does. So effectively unlimited / uncapped cost exposure once deployed.
- **OCR on real handwriting** — proven on rendered script fonts, NOT on messy stylus strokes at speed. Real Apple Pencil scrawl is the actual test and hasn't happened.
- **Graph** handles single-variable y=f(x) only. No parametric, polar, vector fields, 3D, piecewise, or discontinuity handling beyond NaN gaps.

### 🔴 Missing entirely
- Not deployed (no public URL, no tablet access).
- No PDF / problem-set import (engineering homework IS pdfs).
- No formula sheet / reference.
- No exam / timed mode.
- No offline (PWA).
- No weak-topic analytics beyond the practice deck.
- No collaboration / sharing.
- No units & dimensional-analysis engine for physics.
- No "show me only the NEXT step" mode.
- No curated problem bank.

---

## 2. The vision (what "perfect for engineering" means)

An engineering student's real loop, today, across a semester:
1. Gets a problem set (PDF) + lecture notes.
2. Attempts problems, often stuck, no solutions for half of them.
3. Crams from past exams before the test.
4. Forgets everything by the next course that depends on it.

**MathPad should own all four:**
- **Solve** — handwrite/type, instant "where + why wrong", worked solutions on demand.
- **Understand** — graphs, alternate-method validation, step-by-step.
- **Practice** — generated drills, spaced repetition, weak-topic targeting.
- **Retain & prepare** — exam simulator, formula sheets, progress dashboard.

---

## 3. Prioritized roadmap (phases)

> Ordering logic: **make it durable & real (Phase 1) → make it a study tool not just a checker (Phase 2) → make it sticky & smart (Phase 3) → scale & polish (Phase 4).**
> Don't build Phase 3 sparkle before Phase 1 plumbing. A beautiful checker that loses your notebook is a toy.

### PHASE 1 — Make it REAL (durability + deploy) 🔥 do first
The app is useless to a real student until their work survives and is reachable on their tablet.

1. **Wire the notebook to Supabase (replace localStorage as source of truth).**
2. **Deploy** — Vercel (web) + Supabase (db/auth) + Gemini (OCR, no Python needed in prod). Drop the Pix2Text/SymPy Python sidecar from the critical path OR host it separately; make SymPy optional.
3. **PWA** — installable on iPad home screen, offline shell, "add to home screen" prompt.
4. **Cost guardrails** — enforce per-user daily quota for real (not just when logged in); add rate limiting; cache identical checks.
5. **Real-device QA** — actual iPad + Apple Pencil + Android tablet pass. Fix pen latency, palm rejection, OCR-on-real-handwriting.

### PHASE 2 — Make it a STUDY TOOL (not just a checker)
6. **PDF / image problem-set import** — drop a homework PDF, auto-split into exercises, OCR each question. THE killer feature for engineering.
7. **Formula sheet / reference panel** — per-course cheat sheets (calc, LA, ODE, physics), searchable, insertable.
8. **"Next step only" hint mode** — for the student who wants a nudge, not the whole solution.
9. **Better math input** — a math keyboard/palette (∫ ∑ √ π ∂ matrices, Greek) for typed mode; LaTeX live-preview.
10. **Units & dimensional analysis** for physics — flag "you added m/s to m", verify final units.

### PHASE 3 — Make it SMART & STICKY (retention)
11. **Progress dashboard** — mastery heatmap by topic, streaks, "you're weak on IBP" insights.
12. **Exam simulator** — timed mock exam from a topic set, no hints, graded at the end with a report.
13. **Smarter graphs** — parametric, polar, vector fields (E&M!), slope fields for ODEs, 3D surfaces (multivariable), Riemann-sum animation.
14. **Spaced-repetition notifications** (PWA push / email) — "5 cards due today."
15. **Curated problem bank** — seed real course problem sets so a new user has content day one.

### PHASE 4 — SCALE & POLISH (growth + business)
16. **Collaboration** — share an exercise/solution, study-group notebooks, "explain this to me" peer mode.
17. **Monetization** — free tier (N checks/day) + Pro (unlimited, exam mode, PDF import). Stripe.
18. **Accessibility + performance audit** — Lighthouse, keyboard nav, screen-reader for the non-math chrome.
19. **Analytics + error monitoring** — Sentry, PostHog; track which problems get flagged "this hint was wrong."
20. **Multi-tenant / institutions** — professor dashboards, assign problem sets, class analytics (B2B2C upside).

---

## 4. Concrete task list (handoff-ready, with acceptance criteria)

Each task is sized and has a definition-of-done so an agent can pick it up cold.

### P1.1 — Supabase-backed notebook  `[L]`
- **Do:** Replace `lib/exercise.ts` localStorage with Supabase tables (`notebooks`, `exercises`, `parts`, `checks`). Keep localStorage as offline cache + write-through. Use existing `app/notebooks/*` + RLS as the base; delete the orphaned standalone flow OR merge `app/page.tsx` into it.
- **Schema:** already drafted in `supabase/schema.sql` — extend `pages`→`exercises` with `parts jsonb`, add `problem_image` (Supabase Storage ref, not base64 in a row).
- **DoD:** Sign in on laptop, create exercise, open on phone → it's there. Sign out / clear cache → nothing lost.

### P1.2 — Deploy  `[M]`
- **Do:** Push to GitHub → Vercel import. Env: `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_*`. Set Supabase Auth redirect URLs to the Vercel domain. **Make OCR Gemini-only in prod** (Python sidecar is a localhost dev convenience; don't put it on the critical path). Make `/api/check-work` SymPy call gracefully skip if no sidecar (already does — verify).
- **DoD:** Public HTTPS URL, magic-link login works, full solve loop works on a phone browser.

### P1.3 — PWA  `[M]`
- **Do:** `manifest.json`, service worker (next-pwa or hand-rolled), offline app shell, icons, "Add to Home Screen". Cache the app shell + KaTeX/fonts; never cache API responses.
- **DoD:** Installs to iPad home screen, opens fullscreen, app shell loads with no network (checks still need network, show a friendly offline banner).

### P1.4 — Cost guardrails  `[S]`
- **Do:** Enforce daily check quota for ALL users (anon by device id + logged-in by user id). Add a simple in-memory + Supabase rate limit. Hash (problem+studentLines) → cache the grade for 24h so re-checks are free.
- **DoD:** N+1th check in a day returns 429 with upgrade copy; identical re-check returns cached result instantly + free.

### P1.5 — Real-device QA  `[M]`
- **Do:** Test on iPad Safari + Apple Pencil and one Android tablet. Measure pen latency, fix palm rejection, verify OCR on genuinely messy handwriting; tune the OCR prompt / preprocessing (binarize, thicken) if accuracy < 90% on real strokes.
- **DoD:** A real student can handwrite a 4-line solution and get correct OCR ≥9/10 times.

### P2.1 — PDF problem-set import  `[L]`  ⭐ highest-value Phase 2 item
- **Do:** Upload PDF → render pages → either (a) let user box each problem, or (b) auto-segment via the vision model → create one exercise per detected problem with its image attached, OCR the question text (`mode=problem`). Use `pdf.js` for rendering.
- **DoD:** Drop a 5-problem homework PDF → get 5 exercise cards, each with the question image + OCR'd text, ready to solve.

### P2.2 — Formula sheet / reference  `[M]`
- **Do:** Per-domain reference cards (derivatives table, integrals table, trig identities, Laplace transforms, physics constants/equations). Slide-over panel, searchable, KaTeX-rendered. Static JSON content to start.
- **DoD:** While solving, open reference, search "integration by parts", see the formula; bonus: tap to insert into work.

### P2.3 — "Next step only" hint  `[S]`
- **Do:** New mode on the grader: given problem + partial work, return ONLY the single next step (not the whole solution). Add `nextStep` to the API or a `mode: "nudge"` param.
- **DoD:** Stuck mid-problem, tap "what's my next step" → one line, not the answer.

### P2.4 — Math input palette  `[M]`
- **Do:** A tap-able symbol bar above the type-mode textarea (∫ ∑ √ π ∂ ∞ ≤ ≥ Greek, fraction template, matrix template, exponent/subscript). Optional live KaTeX preview under the textarea.
- **DoD:** A user with no LaTeX knowledge can type `∫₀^∞ e^{-x} dx` via taps.

### P2.5 — Units / dimensional analysis  `[M]`
- **Do:** Extend physics grading: parse units in the final answer, verify dimensional consistency, flag missing/mismatched units. Could lean on SymPy's `physics.units` in the sidecar.
- **DoD:** "v = 5 m" on a velocity problem → flagged "units should be m/s".

### P3.1 — Progress dashboard  `[M]`
- **Do:** Aggregate `checks` + practice deck → mastery per topic (heatmap), accuracy trend, current streak, "weakest topics" list with a one-tap "drill this" → practice mode.
- **DoD:** A `/dashboard` page showing topic mastery and a "practice your weakest topic" CTA.

### P3.2 — Exam simulator  `[L]`
- **Do:** Pick topics + count + timer → generate a mock exam (reuse `/api/similar`), no hints during, grade all at the end, produce a report (score, per-topic breakdown, which to review). Save attempts.
- **DoD:** "30-min, 5-problem calc-2 mock" → timed run → end report → failed topics auto-added to practice deck.

### P3.3 — Smarter graphs  `[L]`
- **Do:** Add curve types to `FunctionGraph`: parametric (x(t),y(t)), polar r(θ), slope field for first-order ODEs, vector field (2D), and a Riemann-sum overlay toggle. Consider a 3D mode (multivariable) — maybe a separate lightweight WebGL component.
- **DoD:** An ODE problem shows a slope field; a multivariable problem shows a surface/contour.

### P3.4 — Notifications  `[S]`
- **Do:** PWA push (or email via Supabase) "X cards due today." Respect quiet hours.
- **DoD:** Due cards trigger a daily reminder.

### P3.5 — Problem bank  `[M]`
- **Do:** Seed curated problems per course/topic (start with the eval set + generated). Browse → "add to notebook" / "practice".
- **DoD:** A new user with an empty notebook can pull 10 calc-1 problems to start.

### P4.x — see Phase 4 list above (collab, Stripe, a11y/perf, analytics, institutions).

---

## 5. Things to FIX in current code (debt the next agent will hit)

- **Two persistence systems** — localStorage notebook vs Supabase `/notebooks`. Pick one (Supabase) and delete/merge the other. Confusing as-is.
- **`problemImage` stored as base64 in the exercise object** → bloats localStorage, will blow Supabase row limits. Move to Supabase Storage / object URLs.
- **No error monitoring** — add Sentry before real users.
- **Grader latency 5–18s** on hard multi-error problems — stream the response so the UI fills progressively; show a skeleton.
- **SymPy sidecar antlr conflict** — `parse_latex` disabled (antlr 4.9 vs 4.11 vs pix2text's omegaconf). We hand-roll LaTeX→sympy cleanup instead; it's lossy on exotic LaTeX. If SymPy matters in prod, containerize it separately with its own pinned deps.
- **Quota bypass** — the daily cap is dead code for anon users; wire it for real (see P1.4).
- **No tests in CI** — the eval harness (`eval/*.mjs`) is gold; wire it into CI so prompt changes don't regress grading. Add a GitHub Action.
- **Prompt is one giant string** — getting long. Consider splitting per-domain and selecting by a cheap classifier call (or keep monolith but version it + snapshot eval scores per change).
- **Accessibility** — canvas + math have no a11y story; fine for now, needed for institutions.

---

## 6. Architecture notes for whoever builds next

- **Stack:** Next.js 15 (App Router) + React 19 + Tailwind. DeepSeek V4 Flash (grading, `lib/deepseek.ts`, OpenAI-compatible). Gemini 2.5 Flash (OCR, `lib/ocr-gemini.ts`). Supabase (auth + Postgres, `lib/supabase/*`). KaTeX (render). perfect-freehand (canvas). Hand-rolled SVG graph (`components/FunctionGraph.tsx`) + safe expr compiler (`lib/plot.ts`). Python sidecar `ocr-service/app.py` (Pix2Text OCR fallback + SymPy `/equiv`) — **dev convenience, keep optional**.
- **Core API:** `POST /api/check-work` is the brain — read its system prompt; it's where most of the product value lives. `POST /api/ocr` (mode=problem|answer). `POST /api/similar` (practice gen). `GET /api/ocr/status`.
- **i18n:** `lib/i18n.ts`, EN/HE, RTL via `dir`. Add languages by extending the dict + passing `language` to APIs.
- **Eval harness:** `eval/*.mjs` — run against a live dev server. **This is the safety net. Run it after any grader/OCR change.** `node eval/full-test.mjs`, `node eval/hard-test.mjs`, `node eval/multistep.mjs`.
- **Cost reality:** Gemini Flash OCR ~free tier (250/day). DeepSeek V4 Flash ~$0.001/check with caching. Keep caching aggressive; it's the margin.
- **Cheapest-model rule (project standard):** prefer DeepSeek/Gemini Flash; only escalate models with eval evidence.

---

## 7. If I had to pick the ONE next thing

**Deploy + Supabase persistence (Phase 1.1 + 1.2).** Everything else is polish on a sandcastle until a student's notebook survives a refresh and opens on their tablet. Ship that, put it in 5 real engineering students' hands, watch them use it for a week, then let their pain pick Phase 2.
