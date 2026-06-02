# Handoff #2 — fix what's broken in production + engineering wishlist

App is live at https://mathapp-chi.vercel.app. Code at github.com/ilay102/mathapp.

Found by the user on a real session:

---

## 🔴 P0 — BUGS that make the app feel broken (fix first)

### B1. The function graph is unusable after one scroll
**File:** `components/FunctionGraph.tsx`
**What happens:** User scrolled accidentally; range jumped from `[-5, 5]` to `[-43, 130]`. With 114 zeros + 53 max + 55 min markers all dumped on top of each other and overlapping labels, the chart looks like static. The caption still says "range [-5, 5]" while the actual view is something else entirely.

**Fixes (do all):**
1. **Clamp zoom span** to `[0.5, 4 * initialSpan]`. Wheel handler should refuse to widen beyond ~4× the originally-requested range. Same for height.
2. **Don't trust auto-derived annotations at extreme zoom.** When current span > 2× initial span, hide annotations entirely (or only show the top 3 by `|y|` per kind).
3. **Hard cap: at most 5 zeros, 3 max, 3 min visible.** Sort by `|y|` descending or by proximity to origin and take the first N. Currently we dump every one we find.
4. **Annotation labels overlap with each other and with the curve.** Implement simple greedy de-collision: only draw a label if it doesn't overlap the previous one's bounding box. If it does, drop the label but keep the dot.
5. **Caption lies about the range.** Update the "(range [a, b])" caption to reflect *current* `view`, not the original `range` prop. Recompute on pan/zoom.
6. **Reset button is too easy to miss** when the chart is broken. Promote it to a chip in the top-right corner of the SVG that's always visible (not just in the figcaption). Icon `restart_alt`.
7. **Two-finger pinch zoom on touch devices** doesn't work — only mouse wheel does. Add `gesturechange` listener (iOS Safari) and pinch-via-pointer (multitouch pointer events).

**Acceptance:** Open the chain-rule example, scroll the mouse wheel 5 times, the graph stays readable. Tap a "reset" chip — view + annotations return to default. On iPad, pinch-zoom works.

---

### B2. UI clutter — too many almost-identical buttons in the exercise card
**File:** `components/PartCard.tsx` (the "write" mode section)
**What's there now:**
- "Preview reading" button
- "Append (don't replace)" checkbox
- "Start fresh" button
- Pen color/size toolbar
- Write/Type tabs
- Show ALL my mistakes button

The user said: *"all this button? useless"*. They're right — too many controls on the primary surface.

**Fixes:**
1. **Remove "Preview reading" button entirely** OR move it into an overflow menu (`⋮`). The check button already auto-OCRs; no one needs to preview separately on every check.
2. **Remove the "Append (don't replace)" checkbox** from the primary toolbar — move into a settings/overflow menu. Default to "replace"; ~95% of users only want that.
3. **"Start fresh" → demote.** Move it into the overflow menu too, or behind a long-press / secondary tap on the textarea. Right now it competes visually with the primary action.
4. **The whole "What we'll grade — edit if the OCR got it wrong" label + empty textarea is dead space** when the canvas is empty. Hide the textarea until it has content OR there's been an OCR pass. Show a small inline hint instead: "Tap *Show ALL my mistakes* to grade your work — we read it automatically."
5. **The primary CTA "Show ALL my mistakes" should be the only big button.** Everything else should be subtle (text links or icons), not pill buttons that demand attention.

**Acceptance:** On a fresh exercise, the user sees: pen toolbar (compact) → canvas → one big "Show ALL my mistakes" button. That's it. Everything else hides behind a `⋮` icon.

---

### B3. Grader treats mid-solving work as "wrong"
**File:** `app/api/check-work/route.ts` (system prompt)
**What user reported:** *"the brain need to know if someone write a half answer right then continue — is not wrong like he is solving and steps"*

Example flow that's currently broken:
- Problem: Differentiate sin(x²)
- Student line 1: `f'(x) = cos(x²) · d/dx[x²]`  ← valid intermediate step, not the final answer
- Student line 2: `= 2x cos(x²)`  ← correct final

If the student STOPS after line 1, the grader currently marks "incomplete" + sometimes flags line 1 as wrong because it doesn't match `2x cos(x²)`.

**Fix (prompt change):**
Add this block to the system prompt right after "GRADING RULES:":

```
INTERMEDIATE-STEP RULE (very important):
A student is often mid-solving. NEVER mark a line "wrong" if it is a valid intermediate step that hasn't been simplified yet. Examples that are CORRECT (not wrong):
- "f'(x) = cos(x²) · d/dx[x²]"  ← unsimplified application of chain rule, before evaluating d/dx[x²]
- "x = (5 ± √1)/2"               ← quadratic formula before computing
- "= ∫cos(u) du"                  ← after u-sub, before integrating
- "lim → 0/0"                     ← noticing indeterminate form before applying L'Hôpital
If the student STOPS at a valid intermediate without finishing → status: "incomplete", errors: [].
If the student WROTE one valid intermediate AND THEN a correct final → status: "correct".
Only mark "wrong" when there is an actual error in the math, not when the student is mid-derivation.
```

**Acceptance:** Run these manually via /api/check-work and confirm:
- problem: `Differentiate sin(x²)`, lines: `["f'(x) = cos(x²) · d/dx[x²]"]`  →  status `incomplete`, errors: 0
- problem: `Differentiate sin(x²)`, lines: `["f'(x) = cos(x²) · d/dx[x²]", "= 2x cos(x²)"]`  →  status `correct`, errors: 0
- problem: `Differentiate sin(x²)`, lines: `["f'(x) = cos(x²)"]` (skipping the chain step entirely)  →  status `wrong`, 1 error  ← still wrong, no regression

---

### B4. Math input palette uses a global `window.insertMathCallback`
**File:** `components/MathPalette.tsx` + `components/PartCard.tsx`
**Bug:** With multiple part-cards open, focusing into one textarea then clicking palette inserts into the LAST-focused textarea regardless. The global var is overwritten on every focus.

**Fix:** Use a React context (e.g. `MathInputContext`) that PartCard provides + MathPalette consumes. Or pass the insert function as a prop into MathPalette from the focused part. Pattern:
```tsx
// lib/mathInputContext.ts
const MathInputContext = createContext<(s: string) => void | null>(null);
// PartCard wraps its tree in <MathInputContext.Provider value={insertAtCursor}>
// MathPalette calls useContext(MathInputContext)?.(symbol)
```

**Acceptance:** Open a 3-part exercise. Type something in part 2's textarea, click π in the palette. It inserts into part 2, not part 1 or 3.

---

### B5. Sidebar renders on `/login` and `/auth/callback`
**File:** `app/layout.tsx`
**Bug:** Login screens shouldn't show the app chrome.
**Fix:** Either render Sidebar conditionally (read pathname via a client component wrapper) or move the layout into a `(app)` route group and create a separate `(auth)` group without Sidebar.

---

## 🟡 P1 — Engineering essentials we don't have

### E1. 3D surface plot for multivariable
**File:** new `components/Graph3D.tsx`
**Why:** `z = f(x, y)` problems (partial derivatives, gradients, double integrals) need 3D viz.
**How:** Add `three.js` + `@react-three/fiber` + `@react-three/drei` (~250 KB). Build a `<Surface3D expr="x^2 + y^2" />` component:
- Sample fn on a 50×50 grid over `[xMin, xMax] × [yMin, yMax]`
- Build a `BufferGeometry` with vertex colors by height (rainbow gradient)
- Orbit controls (drag to rotate, scroll to zoom)
- Toggle wireframe / filled / contour-lines mode
- Optional: drop gradient vectors from `∇f` as little arrows

Grader returns `graphExpr3D` when domain === "multivariable" and the function is single-output `f(x, y)`. Falls back to 2D contour heatmap if 3D is too heavy.

**Acceptance:** Problem "Compute ∂f/∂x for f(x,y) = x²y + sin(xy)" → result panel shows orbit-able 3D surface.

---

### E2. Vector fields, slope fields, parametric/polar
**File:** extend `components/FunctionGraph.tsx` with new chart types
- **Slope field:** for ODEs `dy/dx = f(x, y)`. Sample at 20×15 grid, draw little tangent line segments. Click anywhere to draw a solution curve through that point (numeric integration, RK4).
- **Vector field 2D:** for `F(x,y) = (P, Q)`. Same grid but draw arrows.
- **Parametric:** `(x(t), y(t))` over `t ∈ [a, b]`.
- **Polar:** `r(θ)`.

Grader returns `chartType: "slopefield" | "vectorfield" | "parametric" | "polar" | "1d"` (default `1d`) and the relevant expr fields.

**Acceptance:** A problem "Sketch the slope field of y' = y - x" produces an interactive slope field.

---

### E3. Riemann sum visualizer for definite integrals
**File:** extend `FunctionGraph.tsx`
- Toggle: show `n` rectangles (left / right / midpoint / trapezoid) over `[a, b]`
- Slider for `n` from 1 to 100
- Show "Approximation: 8.42, Exact: 8.33, Error: 0.09" below
**Why:** ∫ problems should let students FEEL the approximation converging.

---

### E4. Step-by-step solution animation
**File:** `components/CheckResult.tsx` → `WorkedSolution`
**Now:** worked steps are revealed all at once on "Hide solution → Show solution".
**Better:** "Play" button steps through `step 1 → 2 → 3` with 1.5s delays, highlighting the change between consecutive steps (diff the LaTeX, color the additions green). Pause / next / prev controls.

---

### E5. Math input upgrades
**Files:** `components/MathPalette.tsx` + new `components/EquationEditor.tsx`
- Add Greek letters tab (α β γ δ ε θ λ μ π ρ σ τ φ ω + capitals)
- Add complex/engineering tab: i, j (engineering imaginary), ∞, ∂, ∇, ∮, ⊕, ⊗, ‖·‖
- Add matrix template: tap "Matrix" → choose size → inserts `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` skeleton with tab navigation between cells
- Add **live KaTeX preview** below the textarea so users see what they're typing
- Add **voice input** button: Web Speech API → math-aware (commercial; reads "x squared plus two" → `x^2 + 2`)

---

### E6. Units & dimensional analysis for physics
**File:** new `lib/units.ts` + extend grader prompt
- Parse "5 m/s²" or "9.8 m/s^2" into `{ value: 5, units: { m: 1, s: -2 } }`
- Verify physics answers have CORRECT units (kinetic energy must be J, velocity m/s, etc.)
- Conversion: tap a number to convert (km/h ↔ m/s, eV ↔ J, ...)
- Grader prompt: include unit-checking rules and use returned values

**Acceptance:** Problem "Compute KE for m=2kg, v=3m/s" with answer `9` → flagged: "missing units; expected joules". With answer `9 J` → correct.

---

### E7. Constants library
**File:** new `components/ConstantsPanel.tsx`
List of useful values with tap-to-insert:
- π, e, φ
- c, G, h, ℏ, k_B, N_A, R, ε_0, μ_0
- m_e, m_p, m_n, q_e
- g, atm
With units. Hebrew/English labels.

---

### E8. Matrix / vector calculator
**File:** new page `/tools/matrix`
- Input matrices via the inserted template
- Compute: det, inverse, rank, eigenvalues, eigenvectors, RREF, A·B, A·x
- Pure client-side via small numeric library OR call our SymPy sidecar via a new `/api/matrix` endpoint
- Step-by-step option ("show me row reduction")

---

### E9. Laplace transform input/output
**File:** new `/tools/laplace`
For ODE problems — accept `L{f(t)}`, return `F(s)` symbolically. Wraps SymPy `laplace_transform` (sidecar). Useful for EE / control systems.

---

### E10. Plot from data
**File:** new `components/DataPlot.tsx`
- Paste CSV / pairs of numbers
- Linear / log / log-log axes
- Linear / polynomial / exponential fit with R²
- For lab reports, data analysis problems

---

## 🟢 P2 — Polish / retention

- **PDF problem-set import**: drop a homework PDF → auto-split into exercises with their question images. (Was in Roadmap Phase 2; still the killer feature.)
- **Live KaTeX preview** under every math textarea
- **"Next step only" hint** mode (the grader returns just `nextStep` instead of the full solution)
- **Voice input** ("two x times sine of x squared" → `2x sin(x^2)`)
- **Print / export to PDF** of a notebook / single exercise (for submitting homework)
- **Streak badges + per-topic mastery dashboard polish**
- **Spaced-repetition notifications** (Web Push or email)
- **PWA install banner** on mobile

---

## 🛠 Production hardening (do before traffic grows)

1. **Replace in-memory rate limit with Upstash Redis** (`@upstash/redis` + `@upstash/ratelimit`).
   `app/api/check-work/route.ts` currently uses `Map<string, …>` which is per-instance on Vercel. With Upstash it's a one-line swap.
2. **Add Sentry** for error monitoring (`@sentry/nextjs`).
3. **Hash-based cache key collisions**: `problem + studentLines` string concat is OK but fragile. Use a proper hash (`crypto.subtle.digest`).
4. **`pages.strokes jsonb` column lies about its content** — it now holds the whole `parts[]` array. Add a Supabase migration: rename column to `content` (or add `content` jsonb and copy over).
5. **CI**: wire `eval/full-test.mjs` and `eval/hard-test.mjs` into a GitHub Action that runs nightly against a preview deploy. Grader changes shouldn't ship without an eval run.
6. **Wire Vercel Analytics** (free) to see who's actually using which routes.

---

## 📐 Architecture pointers for the Antigravity agent

- **Tech stack** unchanged: Next.js 15 App Router, Supabase, DeepSeek V4 Flash (grading), Gemini 2.5 Flash (OCR), KaTeX, `perfect-freehand` (canvas), hand-rolled SVG graph in `components/FunctionGraph.tsx` + safe expr compiler in `lib/plot.ts`.
- **Read** `app/api/check-work/route.ts` — the system prompt is the soul of the app. Don't break what works; the eval harness in `eval/` is the safety net.
- **Read** `lib/dataService.ts` — every notebook/page CRUD goes through here. Supabase when logged in, localStorage when guest, auto-merge on sign-in.
- **Run** `npm run dev` for local; `npm run build` to mirror Vercel's strict typecheck.
- **Eval workflow**: bring up dev server → `node eval/run.mjs` (15 single-line cases) → `node eval/full-test.mjs` (16 image→OCR→grade cases) → `node eval/hard-test.mjs` (16 hard image→OCR→grade cases). Target: ≥95% pass on all three before shipping any grader change.
- **Cost model**: Gemini OCR free tier (250/day) handles solo dev; DeepSeek V4 Flash with cache hits is ~$0.001 per check. Heavy caching is the margin.

---

## Priority order for the next session

1. **B1** (graph zoom) — 1 hour, visible win
2. **B2** (UI declutter) — 30 min, visible win
3. **B3** (intermediate-step rule) — 15 min prompt edit + eval verification — biggest pedagogy fix
4. **B4** (palette context) — 30 min
5. **B5** (no sidebar on login) — 10 min
6. **E1** (3D plots) — 4-6 hours, biggest engineering feature
7. **E3** (Riemann visualizer) — 2 hours
8. **E2** (slope/vector fields) — 4 hours
9. **E6** (units) — 3 hours
10. Everything else when there's time
