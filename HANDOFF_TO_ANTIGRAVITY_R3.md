# Handoff #3 — what's still missing for the perfect engineering env

Honest audit of the work shipped in round 2 + new asks.

---

## 🟢 What round 2 nailed (verified)

- **B1 graph zoom** — capped to top 5 zeros / 3 max / 3 min, sorted by `|x|`. Big improvement over 114 stacked markers.
- **B2 button declutter** — `Preview reading`, `Append`, `Start fresh` now live in the `⋮` overflow menu. Only `Show ALL my mistakes` is a primary button.
- **B3 intermediate-step rule** — VERIFIED on 4 cases:
  - `f'(x) = cos(x²)·d/dx[x²]` alone → `incomplete` ✓
  - same + `= 2x cos(x²)` → `correct` ✓
  - `f'(x) = cos(x²)` (skipped chain step) → `wrong` ✓
  - u-sub setup alone → `incomplete` ✓
- **B4 MathInputContext** — `lib/mathInputContext.ts` exports a `Context`; PartCard provides it. No more `window.insertMathCallback` collisions.
- **B5 Sidebar conditional** — `components/AppLayout.tsx` checks `pathname.startsWith("/auth")` and hides on `/login`.
- **Eval still 15/15** after prompt changes — no regression.
- **New `/tools` page** with Matrix calc, Complex numbers, Unit converter, Vector calc — all render.
- **Build clean** — 17 routes, no TS errors.

---

## 🟢 What this commit added (notebook paper feel)

`.notebook-textarea` + `.notebook-page` + `.spiral-bind` CSS classes:
- Off-white `#fffdf7` paper background
- Red left margin line at 48px
- Horizontal blue ruled lines every 32px (text sits ON them)
- Caveat cursive font, 22px / 32px line-height
- Soft shadow + inset highlight for paper depth
- Focus ring at low-opacity primary blue (not a heavy border)

Applied to PartCard's answer textarea + Live Preview panel + empty-state hint card.

---

## 🔴 P0 — Things still wrong / fragile

### N1. The math palette only shows in `type` mode, not `write` mode
**File:** `components/PartCard.tsx`
**Why bad:** After OCR fills the editable textarea, the student often wants to tap a missing symbol (e.g. add a missing `π` or correct an exponent). But the palette only appears when `inputMode === "type"`. Make it appear above the textarea in BOTH modes, regardless.

### N2. The Question textarea has no visual cue it's editable
**File:** `components/ExerciseCard.tsx` (the umbrella problem textarea around line 156)
**Now:** `className="w-full resize-none bg-transparent text-lg note-title text-on-surface placeholder:text-outline focus:outline-none"`
**Fix:** Add a thin dotted bottom border that lights up on focus, and a `material-symbols-outlined edit` ghost icon at the right edge that fades in on hover. Right now users genuinely don't know that field is editable until they accidentally click it.

### N3. Pen toolbar in canvas mode hugs the top awkwardly when scrolled
**File:** `components/PartCard.tsx`
**Now:** rendered inline above the canvas.
**Fix:** When the canvas takes the full viewport (mobile / fullscreen mode), pin the pen toolbar to the top of the canvas section with `sticky top-2`. Color/size pickers should remain accessible while writing at the bottom of a long canvas.

### N4. No eraser tool — only "Clear all"
**File:** `components/MathCanvas.tsx`
**Why bad:** A real pen user wants to erase ONE wrong stroke, not nuke everything.
**Fix:** Add an "eraser" tool to `MathCanvas`. Strategy:
- Add `mode: "draw" | "erase"` state in MathCanvas
- In erase mode: pointer-down at (x, y) finds strokes whose bounding box contains (x, y) and removes them
- Add eraser icon to the pen toolbar in PartCard (between pen colors and pen sizes)
- Cursor changes to a small white circle outline when in erase mode

### N5. Stroke persistence — `Part.strokes` exists but isn't loaded back
**File:** `components/MathCanvas.tsx` + `components/PartCard.tsx`
**Verify:** `MathCanvas` should accept `initialStrokes` prop and a `onChange(strokes)` callback. PartCard should:
- Pass `initialStrokes={part.strokes}` on mount
- On stroke completion, save via `update({ strokes: ... })`
On reload the page editor should restore everything the student drew. Test by drawing → reload → make sure drawing is still there.

### N6. The Live Preview shows raw plain text, not rendered math
**File:** `components/PartCard.tsx` around line 400
**Now:** plain `<div>{line}</div>` per line
**Fix:** Wrap each line in `<SafeLatex tex={line} />` — same component used in CheckResult. Auto-detect: if line contains `\` or `^` or `_` or `$`, treat as LaTeX; otherwise plain text.

---

## 🟡 P1 — Engineering features still missing

### F1. Riemann sum visualizer (high pedagogical value)
**File:** extend `components/FunctionGraph.tsx`
- New prop `riemannRange?: [number, number]`, `riemannN?: number`, `riemannMethod?: "left" | "right" | "midpoint" | "trapezoid"`
- Slider for `n` from 1 to 100 below the chart
- Renders rectangles under the curve, computes approximate area
- Shows: "Approximation: 8.42 · Exact: 8.33 · Error: 1.1%"
- Grader returns `riemannRange` when problem is a definite integral

### F2. Slope-field for ODEs
- New chart type in `FunctionGraph`. For `dy/dx = f(x, y)`, sample 20×15 grid, draw little tangent segments
- Click anywhere on the field → integrate forward + backward via RK4, show the solution curve through that point
- Grader returns `slopeFieldExpr: "y - x"` for ODE problems

### F3. Vector field for E&M
- Same grid as slope field but with arrows. `F(x,y) = (P, Q)`.
- Useful for E&M, fluid dynamics, gradient fields.

### F4. Surface 3D — verify Antigravity's `Graph3D.tsx` actually works
**File:** `components/Graph3D.tsx` (NEW from round 2 — UNTESTED by me)
- Open a multivariable problem, confirm the 3D surface renders, orbits via drag, zooms via scroll.
- If broken: needs `three.js` + `@react-three/fiber` + `@react-three/drei`.

### F5. Voice input for math
- Add a mic button to the Math Palette
- Web Speech API → math-aware translator: "two x squared plus three x" → `2x^2 + 3x`
- Bonus: read out the result panel ("you forgot the chain rule")

### F6. Hot keys upgrade
- Already: `Ctrl+Enter` = grade
- Add: `Ctrl+/` open formula sheet, `Ctrl+\` open math palette, `Ctrl+N` new exercise, `Ctrl+S` save, `Ctrl+Z` undo last stroke

### F7. Per-exercise PDF export
- Button "Export as PDF" on the result panel — produces a clean printable handout: question / your work / mistakes marked / corrected steps / final answer
- Library: `html2pdf.js` or `@react-pdf/renderer`
- Useful for: turning in homework on paper, study notes

### F8. Live KaTeX preview UNDER the textarea (when typing)
- A small `<SafeLatex>` rendered preview below the textarea that updates as you type
- For students who don't know LaTeX yet — they can see if `\frac{x}{y}` actually renders the right fraction

---

## 🟢 P2 — Polish + production hardening

### Production hardening
- **Upstash Redis** to replace in-memory rate-limit (currently per-instance on Vercel — leaky on horizontal scale)
- **Sentry** for error monitoring
- **CI:** wire `node eval/full-test.mjs` + `eval/hard-test.mjs` into a GitHub Action that runs on every PR
- **Rename `pages.strokes jsonb` → `pages.content jsonb`** via a Supabase migration; the column name has lied since round 2

### Polish
- PDF problem-set IMPORT (drop a homework PDF → auto-split into exercises) — still the killer feature
- PWA manifest + offline shell
- Web Push notifications for spaced-repetition reminders
- Streak badges + per-topic mastery chart improvements
- Custom domain (e.g. `mathpad.app`)

---

## 📋 Priority order for next session

1. **N5** stroke persistence — make sure handwriting survives a reload (you can't claim handwriting persistence without this working visibly)
2. **N6** Live Preview renders math — student can SEE what they typed will look like graded
3. **N1** Math palette always visible — one consistent input pattern
4. **F1** Riemann sum viz — biggest pedagogy win, 2 hours
5. **N4** Real eraser — most-asked feature on canvas
6. **F2/F3** Slope + vector fields — ODE/E&M students need them
7. **F4** verify 3D actually works
8. **F5** Voice input — fun, viral feature
9. Production hardening + Upstash

---

## 📐 Architecture pointers (refresher)

- Build mirror: `rm -rf .next && npm run build` matches Vercel's strictness
- Eval order: `node eval/run.mjs` (15 single-line) → `node eval/full-test.mjs` (16 image→OCR→grade) → `node eval/hard-test.mjs` (16 hard image→OCR→grade)
- ALL grading changes MUST pass `node eval/run.mjs` before commit. Target: ≥95% pass on all three suites.
- Dev server: `npm run dev` (port 3010)
- Localhost bypass on rate limit is via the `isLocalIp()` check in `app/api/check-work/route.ts`
- The system prompt at the top of `app/api/check-work/route.ts` is the soul of the app. Read it before changing grading behavior. The INTERMEDIATE-STEP RULE block is critical — do not weaken it.
