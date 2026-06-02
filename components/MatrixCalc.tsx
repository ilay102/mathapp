"use client";

import { useState, useCallback } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

type MatrixData = number[][];

function zeros(r: number, c: number): MatrixData {
  return Array.from({ length: r }, () => Array(c).fill(0));
}

function identity(n: number): MatrixData {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/* ─── Math functions ─── */

function det2x2(m: MatrixData): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function det3x3(m: MatrixData): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function det(m: MatrixData): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return det2x2(m);
  if (n === 3) return det3x3(m);
  // Cofactor expansion for 4x4
  let d = 0;
  for (let j = 0; j < n; j++) {
    const minor = m.slice(1).map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);
    d += (j % 2 === 0 ? 1 : -1) * m[0][j] * det(minor);
  }
  return d;
}

function inverse(m: MatrixData): MatrixData | null {
  const n = m.length;
  const d = det(m);
  if (Math.abs(d) < 1e-12) return null;

  if (n === 2) {
    return [
      [m[1][1] / d, -m[0][1] / d],
      [-m[1][0] / d, m[0][0] / d],
    ];
  }

  // General: augment [A | I] and row-reduce
  const aug = m.map((row, i) => [...row, ...identity(n)[i]]);
  // Forward elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    if (Math.abs(aug[i][i]) < 1e-12) return null;
    const pivot = aug[i][i];
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

function rref(m: MatrixData): { result: MatrixData; steps: string[] } {
  const r = m.length, c = m[0].length;
  const a = m.map((row) => [...row]);
  const steps: string[] = [];
  let pivotRow = 0;

  for (let col = 0; col < c && pivotRow < r; col++) {
    let maxRow = pivotRow;
    for (let k = pivotRow + 1; k < r; k++) if (Math.abs(a[k][col]) > Math.abs(a[maxRow][col])) maxRow = k;
    if (Math.abs(a[maxRow][col]) < 1e-12) continue;
    if (maxRow !== pivotRow) {
      [a[pivotRow], a[maxRow]] = [a[maxRow], a[pivotRow]];
      steps.push(`R_{${pivotRow + 1}} \\leftrightarrow R_{${maxRow + 1}}`);
    }
    const pivot = a[pivotRow][col];
    if (Math.abs(pivot - 1) > 1e-12) {
      for (let j = 0; j < c; j++) a[pivotRow][j] /= pivot;
      steps.push(`R_{${pivotRow + 1}} \\to \\frac{1}{${fmt(pivot)}}R_{${pivotRow + 1}}`);
    }
    for (let k = 0; k < r; k++) {
      if (k === pivotRow || Math.abs(a[k][col]) < 1e-12) continue;
      const factor = a[k][col];
      for (let j = 0; j < c; j++) a[k][j] -= factor * a[pivotRow][j];
      steps.push(`R_{${k + 1}} \\to R_{${k + 1}} - (${fmt(factor)})R_{${pivotRow + 1}}`);
    }
    pivotRow++;
  }

  return { result: a, steps };
}

function eigenvalues2x2(m: MatrixData): string {
  const a = m[0][0], b = m[0][1], c = m[1][0], d = m[1][1];
  const trace = a + d;
  const determinant = a * d - b * c;
  const disc = trace * trace - 4 * determinant;
  if (disc >= 0) {
    const l1 = (trace + Math.sqrt(disc)) / 2;
    const l2 = (trace - Math.sqrt(disc)) / 2;
    return `λ₁ = ${fmt(l1)}, λ₂ = ${fmt(l2)}`;
  } else {
    const real = trace / 2;
    const imag = Math.sqrt(-disc) / 2;
    return `λ = ${fmt(real)} ± ${fmt(imag)}i`;
  }
}

function eigenvalues3x3(m: MatrixData): string {
  // Characteristic polynomial: -λ³ + tr(A)λ² - (sum of 2×2 minors)λ + det(A) = 0
  const tr = m[0][0] + m[1][1] + m[2][2];
  const m11 = m[1][1] * m[2][2] - m[1][2] * m[2][1];
  const m22 = m[0][0] * m[2][2] - m[0][2] * m[2][0];
  const m33 = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const cofSum = m11 + m22 + m33;
  const d = det3x3(m);

  // λ³ - tr·λ² + cofSum·λ - det = 0
  // Use numerical method (companion matrix eigenvalues via QR would be best, but let's use cubic formula / Newton)
  const roots = solveCubic(1, -tr, cofSum, -d);
  return roots.map((r, i) => `λ${subscript(i + 1)} = ${r}`).join(", ");
}

function solveCubic(a: number, b: number, c: number, d: number): string[] {
  // Normalize: x³ + px² + qx + r = 0
  const p = b / a, q = c / a, r = d / a;
  const Q = (3 * q - p * p) / 9;
  const R = (9 * p * q - 27 * r - 2 * p * p * p) / 54;
  const D = Q * Q * Q + R * R;

  if (D >= 0) {
    const sqrtD = Math.sqrt(D);
    const S = Math.cbrt(R + sqrtD);
    const T = Math.cbrt(R - sqrtD);
    const x1 = S + T - p / 3;
    if (Math.abs(D) < 1e-10) {
      const x2 = -(S + T) / 2 - p / 3;
      return [...new Set([fmt(x1), fmt(x2)])];
    }
    const realPart = -(S + T) / 2 - p / 3;
    const imagPart = (Math.sqrt(3) / 2) * (S - T);
    return [fmt(x1), `${fmt(realPart)} + ${fmt(imagPart)}i`, `${fmt(realPart)} - ${fmt(imagPart)}i`];
  } else {
    const theta = Math.acos(R / Math.sqrt(-Q * Q * Q));
    const sqrtNegQ = 2 * Math.sqrt(-Q);
    const x1 = sqrtNegQ * Math.cos(theta / 3) - p / 3;
    const x2 = sqrtNegQ * Math.cos((theta + 2 * Math.PI) / 3) - p / 3;
    const x3 = sqrtNegQ * Math.cos((theta + 4 * Math.PI) / 3) - p / 3;
    return [fmt(x1), fmt(x2), fmt(x3)];
  }
}

function transpose(m: MatrixData): MatrixData {
  return m[0].map((_, j) => m.map((row) => row[j]));
}

function rank(m: MatrixData): number {
  const { result } = rref(m);
  return result.filter((row) => row.some((v) => Math.abs(v) > 1e-12)).length;
}

function trace(m: MatrixData): number {
  return m.reduce((s, row, i) => s + row[i], 0);
}

function matMul(a: MatrixData, b: MatrixData): MatrixData | null {
  if (a[0].length !== b.length) return null;
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, val, k) => sum + val * b[k][j], 0))
  );
}

function subscript(n: number): string {
  const subs = "₀₁₂₃₄₅₆₇₈₉";
  return String(n).split("").map((d) => subs[parseInt(d)] || d).join("");
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function matrixToLatex(m: MatrixData): string {
  const rows = m.map((row) => row.map((v) => fmt(v)).join(" & ")).join(" \\\\ ");
  return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
}

export default function MatrixCalc({ lang }: Props) {
  const isRtl = lang === "he";
  const [size, setSize] = useState(3);
  const [matA, setMatA] = useState<MatrixData>(identity(3));
  const [matB, setMatB] = useState<MatrixData>(identity(3));
  const [results, setResults] = useState<{ label: string; value: string; latex?: string }[]>([]);
  const [showB, setShowB] = useState(false);
  const [rrefSteps, setRrefSteps] = useState<string[]>([]);

  const updateSize = (n: number) => {
    setSize(n);
    setMatA(identity(n));
    setMatB(identity(n));
    setResults([]);
    setRrefSteps([]);
  };

  const updateCell = useCallback((mat: "A" | "B", r: number, c: number, val: string) => {
    const setter = mat === "A" ? setMatA : setMatB;
    setter((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = parseFloat(val) || 0;
      return next;
    });
  }, []);

  const compute = (op: string) => {
    const res: { label: string; value: string; latex?: string }[] = [];
    setRrefSteps([]);

    if (op === "det") {
      const d = det(matA);
      res.push({ label: "det(A)", value: fmt(d), latex: `\\det(A) = ${fmt(d)}` });
    }
    if (op === "inv") {
      const inv = inverse(matA);
      if (inv) {
        res.push({ label: "A⁻¹", value: "", latex: `A^{-1} = ${matrixToLatex(inv)}` });
      } else {
        res.push({ label: "A⁻¹", value: isRtl ? "המטריצה סינגולרית (det=0)" : "Matrix is singular (det=0)" });
      }
    }
    if (op === "eigen") {
      if (size === 2) {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: eigenvalues2x2(matA) });
      } else if (size === 3) {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: eigenvalues3x3(matA) });
      } else {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: isRtl ? "נתמך רק 2×2 ו-3×3" : "Supported for 2×2 and 3×3 only" });
      }
    }
    if (op === "rref") {
      const { result, steps } = rref(matA);
      res.push({ label: "RREF(A)", value: "", latex: matrixToLatex(result) });
      setRrefSteps(steps);
    }
    if (op === "transpose") {
      const t = transpose(matA);
      res.push({ label: "Aᵀ", value: "", latex: `A^T = ${matrixToLatex(t)}` });
    }
    if (op === "rank") {
      const r = rank(matA);
      res.push({ label: isRtl ? "דרגה" : "Rank", value: String(r) });
      res.push({ label: isRtl ? "אפסיות" : "Nullity", value: String(size - r) });
    }
    if (op === "trace") {
      const t = trace(matA);
      res.push({ label: "tr(A)", value: fmt(t) });
    }
    if (op === "mul") {
      const product = matMul(matA, matB);
      if (product) {
        res.push({ label: "A · B", value: "", latex: `A \\cdot B = ${matrixToLatex(product)}` });
      } else {
        res.push({ label: "A · B", value: isRtl ? "מימדים לא תואמים" : "Dimension mismatch" });
      }
    }
    setResults(res);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <span className="material-symbols-outlined">grid_view</span>
        </div>
        <h2 className="note-title text-xl font-bold text-on-surface">
          {isRtl ? "מחשבון מטריצות" : "Matrix Calculator"}
        </h2>
      </div>

      {/* Size Selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-on-surface-variant font-medium">{isRtl ? "גודל:" : "Size:"}</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => updateSize(n)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              size === n ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {n}×{n}
          </button>
        ))}
        <button
          onClick={() => setShowB(!showB)}
          className={`ml-4 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            showB ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          {showB ? (isRtl ? "הסתר B" : "Hide B") : (isRtl ? "הצג B (לכפל)" : "Show B (for A·B)")}
        </button>
      </div>

      {/* Matrix Input */}
      <div className="flex flex-wrap gap-8">
        <MatrixInput label="A" size={size} data={matA} onChange={(r, c, v) => updateCell("A", r, c, v)} />
        {showB && <MatrixInput label="B" size={size} data={matB} onChange={(r, c, v) => updateCell("B", r, c, v)} />}
      </div>

      {/* Operations */}
      <div className="flex flex-wrap gap-2">
        {[
          { op: "det", label: "det(A)", icon: "calculate" },
          { op: "inv", label: "A⁻¹", icon: "swap_horiz" },
          { op: "eigen", label: isRtl ? "ע.ע." : "Eigenvalues", icon: "star" },
          { op: "rref", label: "RREF", icon: "table_rows" },
          { op: "rank", label: isRtl ? "דרגה" : "Rank", icon: "format_list_numbered" },
          { op: "transpose", label: "Aᵀ", icon: "flip" },
          { op: "trace", label: "tr(A)", icon: "diagonal_line" },
          ...(showB ? [{ op: "mul", label: "A · B", icon: "close" }] : []),
        ].map((btn) => (
          <button
            key={btn.op}
            onClick={() => compute(btn.op)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container hover:bg-primary-container/80 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 space-y-3 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">output</span>
            {isRtl ? "תוצאות" : "Results"}
          </div>
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-surface-container-low/60 p-3">
              <span className="text-xs font-bold text-on-surface-variant min-w-[60px]">{r.label}</span>
              {r.latex ? (
                <div className="overflow-x-auto text-lg">
                  <SafeLatex tex={r.latex} />
                </div>
              ) : (
                <span className="font-mono text-sm text-on-surface">{r.value}</span>
              )}
            </div>
          ))}

          {/* RREF Steps */}
          {rrefSteps.length > 0 && (
            <div className="mt-3 border-t border-outline-variant/30 pt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                {isRtl ? "צעדי הדירוג" : "Row Reduction Steps"}
              </div>
              <ol className="space-y-1">
                {rrefSteps.map((step, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <SafeLatex tex={step} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatrixInput({
  label, size, data, onChange,
}: { label: string; size: number; data: MatrixData; onChange: (r: number, c: number, v: string) => void }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-on-surface">{label}</span>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              step="any"
              value={data[r]?.[c] ?? 0}
              onChange={(e) => onChange(r, c, e.target.value)}
              className="w-16 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
          ))
        )}
      </div>
    </div>
  );
}

function SafeLatex({ tex }: { tex: string }) {
  try {
    return <InlineMath math={tex} />;
  } catch {
    return <code className="text-xs text-error">{tex}</code>;
  }
}
