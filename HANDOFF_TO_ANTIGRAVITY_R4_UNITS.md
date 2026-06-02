# Handoff #4 — Unit Engine integration

A foundation is already in place. Antigravity needs to **wire it through the UI**.

---

## ✅ What's already done & tested (committed)

### `lib/units.ts` — dimensional algebra engine
- 7-vector dimension representation `[L, M, T, I, Θ, N, J]` (SI base dimensions)
- ~80 units in `UNIT_DB` (base SI + derived SI + imperial + electrical + atomic units)
- 22 SI prefixes (Y to y) auto-applied where it makes sense (k, M, G, m, μ, n, p, …)
- `parseQuantity("9.81 m/s^2")` → `Quantity { value: 9.81, dim: [1,0,-2,0,0,0,0] }`
- `parseUnitExpr("kg·m/s^2")` — supports `·`, `*`, `/`, `²`, `^n`, parens
- `add / sub / mul / div / pow` with dimensional safety (throws `DimensionalError`)
- `format(q)` — auto-detects named units: `kg·m/s² → N`, `V·A → W`, `V/A → Ω`
- `convert(value, from, to)` — between same-dimension units
- `alternativesFor("km/h")` → all length/time-related units for the swap dropdown
- `extractQuantities(text)` — pulls `"<number> <unit>"` tokens out of a string

**Run the test suite:** `npx tsx eval/test-units.mjs`
All cases pass — `velocity + mass`, `N·s + lb·s`, `m_e c² → 511 keV`, etc.

### `components/UnitTag.tsx` — the visual pill
- Two-segment pill: `[ value ][ unit ▾ ]`
- Click `unit ▾` → dropdown of all same-dimension alternatives with live conversions
- `onConvert({ value, unit })` callback to commit the swap
- `annotateWithUnitTags(text)` helper that turns a string of math into React with
  `<UnitTag>` instead of plain digits — drop-in for any rendered math line

### Grader prompt
Added a **UNIT-AWARE RULE** block to `app/api/check-work/route.ts` system prompt that:
- Tells the model to treat numbers as physical quantities
- Flags `5 m/s + 10 kg` as wrong (dimensional mismatch)
- Flags missing units on final answer ("v = 5" instead of "5 m/s") as notation errors
- Recognizes that `kg·m/s² ≡ N` (both forms correct)
- Accepts cross-system conversions (12 in + 30 cm = 0.6048 m)

---

## 🔴 What Antigravity needs to do

### U1. Render UnitTag pills in the result panel
**File:** `components/CheckResult.tsx`
**Where:** the studentLines list (around the `<SafeLatex>` for each line) and the `finalAnswer` block.

Today every line is rendered as KaTeX. Detect lines that look like physics (contain a number followed by a unit symbol from `UNIT_DB`), and:
- Keep KaTeX for the math symbols
- Wrap each `"<number> <unit>"` chunk in `<UnitTag>` so the student can tap to convert

Use `annotateWithUnitTags()` from `UnitTag.tsx` as a starting point. If the line has any LaTeX (`\frac`, `\sin`, etc.), fall back to plain `<SafeLatex>` — don't try to mix.

**Acceptance:** Problem "A ball is thrown at v₀ = 20 m/s". The result panel shows `20 [m/s ▾]` as a pill. Tap `m/s` → dropdown: m/s · km/h · mph · ft/s. Pick `km/h` → pill updates to `72 [km/h ▾]`.

---

### U2. Render UnitTag pills in the Live Preview
**File:** `components/PartCard.tsx` (Live Preview section, around line 405)
**Same as U1**, applied to the student's in-progress lines as they type.

---

### U3. UnitTag in the math palette
**File:** `components/MathPalette.tsx`
Add a new tab **"Units"** with:
- Common SI units: m, kg, s, A, K, N, J, W, Pa, V, Ω
- Imperial: ft, lb, °F, psi, hp
- Prefixed: kΩ, μF, mA, mV, ns, μs
- Each is a tap-to-insert chip; inserts " kg" (with a leading space) at the cursor

Plus a "Constants" tab with common physics constants:
- `c = 2.998e8 m/s`, `g = 9.81 m/s²`, `G = 6.674e-11 N·m²/kg²`
- `h = 6.626e-34 J·s`, `ℏ = 1.055e-34 J·s`, `k_B = 1.381e-23 J/K`
- `N_A = 6.022e23 /mol`, `R = 8.314 J/(mol·K)`
- `ε_0 = 8.854e-12 F/m`, `μ_0 = 4π×10⁻⁷ N/A²`
- `m_e = 9.109e-31 kg`, `m_p = 1.673e-27 kg`, `q_e = 1.602e-19 C`

Tapping a constant inserts the full literal (e.g. `2.998e8 m/s`) at the cursor.

---

### U4. UnitConverter component already exists in components/ — integrate it
**File:** `components/UnitConverter.tsx` already exists from round 2.
- Verify it uses `lib/units.ts` (replace any inline conversion tables with the real engine — single source of truth)
- Wire it into `app/tools/page.tsx` to show it next to MatrixCalc, VectorCalc

---

### U5. Result panel — "this answer could also be expressed as…"
**File:** `components/CheckResult.tsx`
Below the `Final answer should be: X` banner, render related units:
- If finalAnswer is in Joules → also show in Wh, eV, kcal
- If in m/s → also show in km/h, mph
- If in Pa → also show in kPa, psi, bar

Use `alternativesFor()` + `convert()`. Show as small `[150 [J ▾]] = [41.7 [mWh ▾]] = [9.36e20 [eV ▾]]` row.

---

### U6. Dimensional consistency check — UI signal
**File:** new `components/DimensionalCheck.tsx`
Inline next to each line of the student's work, a small indicator:
- ✓ green dot if line is dimensionally consistent (LHS dim == RHS dim)
- ✗ red dot if not, with hover tooltip showing the mismatch

This SUPPLEMENTS the LLM grader — instant pre-check before the API call. Logic:
- Split the line on `=` → LHS, RHS
- `extractQuantities()` on both sides, multiply through if it's a product, etc.
- Compare dims; mismatch → red

Even just detecting the equation pattern `<lhs> = <rhs>` and verifying their final dimensions is huge.

---

### U7. The "dynamic refactoring" feature
**Goal:** if a student writes `m = 10 kg` on line 1, then `F = m·a` on line 2, then changes line 1 to `m = 10 lb`, all downstream values recompute.

**Big feature.** Implement as:
- Each line is parsed into a `{ assign?: string, expression: Quantity }` form
- The notebook keeps a "scope" — name → Quantity map
- On any edit, re-evaluate all subsequent lines top-to-bottom
- Show recomputed values as small grey ghost text next to each line

**Acceptance:** Edit `v₀ = 20 m/s` in line 1 → see "Force = 196.2 N" on line 5 update to "Force = … N" automatically.

---

## 🟢 Polish

- Hebrew/RTL UnitTag layout (RTL: unit on the left, value on the right)
- Dark-mode styling for the pill
- Keyboard shortcut `Ctrl+U` to open a unit-picker over the cursor's current number
- Per-user preference: SI vs Imperial default for new exercises

---

## 🧪 Acceptance tests for the whole feature

After Antigravity's work, run these manually:

1. **Free-body diagram problem**: "A 5 kg block is pushed with 30 N for 4 s. Find Δv."
   - Solve in the notebook: `Δv = F·t/m = (30 N)(4 s)/(5 kg)`
   - Result panel should show: final answer 24 m/s as a UnitTag pill
   - Tap `m/s` → switch to km/h → see 86.4 km/h

2. **Cross-system bug** (Mars Climate Orbiter): student writes `4.45 N·s + 1 lb·s = ?`
   - Live dimensional check shows ✓ (both are momentum)
   - Result: 8.9 N·s (with the 1 lb·s converted to 4.448 N·s and summed)

3. **Drop-units error**: student writes `v² = u² + 2as → v = 14`
   - Grader flags: "Missing units on final answer; should be 14 m/s"

4. **Tap-to-convert**: result shows `100 km/h`. Tap → m/s → confirm UI updates to `27.78 m/s`, value rounds to 4 sig figs.

5. **Constants insert**: open palette → Constants → tap `c`. Cursor textarea now contains `2.998e8 m/s`.

---

## 📐 Notes for the implementer

- **Single source of truth for units** — anything that converts or recognizes units MUST go through `lib/units.ts`. Don't duplicate tables anywhere. If something is missing, add it to `UNIT_DB`.
- **The grader prompt change is light** — it doesn't need to know about the engine, just to think dimensionally. The UI uses the engine to make it visible.
- **Don't auto-substitute the user's text** — that's destructive. UnitTag is a render layer; the underlying `linesText` is still the source of truth.
- **Performance** — `extractQuantities()` is regex-based and cheap. Safe to call on every render.

---

## 🎯 Priority order

1. **U1, U2** — render pills everywhere. Visible win, builds on what already exists.
2. **U3** — palette tabs. 30 min, big perceived value.
3. **U6** — inline dimensional check ✓/✗ dot. Pre-LLM safety net.
4. **U5** — alternative-units row in result panel. Easy.
5. **U4** — wire UnitConverter to the engine. Cleanup task.
6. **U7** — dynamic refactoring. Biggest engineering feature; do last.
