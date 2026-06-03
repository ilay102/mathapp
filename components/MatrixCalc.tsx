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
    return `\\lambda_1 = ${fmt(l1)}, \\lambda_2 = ${fmt(l2)}`;
  } else {
    const real = trace / 2;
    const imag = Math.sqrt(-disc) / 2;
    return `\\lambda = ${fmt(real)} \\pm ${fmt(imag)}i`;
  }
}

function eigenvalues3x3(m: MatrixData): string {
  const tr = m[0][0] + m[1][1] + m[2][2];
  const m11 = m[1][1] * m[2][2] - m[1][2] * m[2][1];
  const m22 = m[0][0] * m[2][2] - m[0][2] * m[2][0];
  const m33 = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const cofSum = m11 + m22 + m33;
  const d = det3x3(m);

  const roots = solveCubic(1, -tr, cofSum, -d);
  return roots.map((r, i) => `\\lambda_${i + 1} = ${r}`).join(", ");
}

function solveCubic(a: number, b: number, c: number, d: number): string[] {
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
  const [results, setResults] = useState<{ label: React.ReactNode; value: string; latex?: string }[]>([]);
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
    const res: { label: React.ReactNode; value: string; latex?: string }[] = [];
    setRrefSteps([]);

    if (op === "det") {
      const d = det(matA);
      res.push({ label: <InlineMath math="\det(A)" />, value: fmt(d), latex: `\\det(A) = ${fmt(d)}` });
    }
    if (op === "inv") {
      const inv = inverse(matA);
      if (inv) {
        res.push({ label: <InlineMath math="A^{-1}" />, value: "", latex: `A^{-1} = ${matrixToLatex(inv)}` });
      } else {
        res.push({ label: <InlineMath math="A^{-1}" />, value: isRtl ? "המטריצה סינגולרית (det=0)" : "Matrix is singular (det=0)" });
      }
    }
    if (op === "eigen") {
      if (size === 2) {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: "", latex: eigenvalues2x2(matA) });
      } else if (size === 3) {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: "", latex: eigenvalues3x3(matA) });
      } else {
        res.push({ label: isRtl ? "ערכים עצמיים" : "Eigenvalues", value: isRtl ? "נתמך רק 2×2 ו-3×3" : "Supported for 2×2 and 3×3 only" });
      }
    }
    if (op === "rref") {
      const { result, steps } = rref(matA);
      res.push({ label: <InlineMath math="\text{RREF}(A)" />, value: "", latex: `\\text{RREF}(A) = ${matrixToLatex(result)}` });
      setRrefSteps(steps);
    }
    if (op === "transpose") {
      const t = transpose(matA);
      res.push({ label: <InlineMath math="A^T" />, value: "", latex: `A^T = ${matrixToLatex(t)}` });
    }
    if (op === "rank") {
      const r = rank(matA);
      res.push({ label: isRtl ? "דרגה (Rank)" : "Rank", value: String(r), latex: `\\text{rank}(A) = ${r}` });
      res.push({ label: isRtl ? "אפסיות (Nullity)" : "Nullity", value: String(size - r), latex: `\\text{nullity}(A) = ${size - r}` });
    }
    if (op === "trace") {
      const t = trace(matA);
      res.push({ label: <InlineMath math="\text{tr}(A)" />, value: fmt(t), latex: `\\text{tr}(A) = ${fmt(t)}` });
    }
    if (op === "mul") {
      const product = matMul(matA, matB);
      if (product) {
        res.push({ label: <InlineMath math="A \cdot B" />, value: "", latex: `A \\cdot B = ${matrixToLatex(product)}` });
      } else {
        res.push({ label: <InlineMath math="A \cdot B" />, value: isRtl ? "מימדים לא תואמים" : "Dimension mismatch" });
      }
    }
    setResults(res);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <span className="material-symbols-outlined text-2xl">grid_view</span>
        </div>
        <div>
          <h2 className="note-title text-2xl font-bold text-on-surface">
            {isRtl ? "מחשבון מטריצות" : "Matrix Calculator"}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {isRtl ? "חישוב דטרמיננטות, הופכיות, ערכים עצמיים, וצעדי דירוג RREF" : "Solve determinants, inverses, eigenvalues, and view row-reduction steps"}
          </p>
        </div>
      </div>

      {/* Options Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant font-medium">{isRtl ? "גודל:" : "Size:"}</span>
          <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline-variant/30">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => updateSize(n)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  size === n ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setShowB(!showB);
            setResults([]);
            setRrefSteps([]);
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 ${
            showB 
              ? "bg-secondary-container/10 border-secondary text-secondary" 
              : "bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {showB ? "layers_clear" : "library_add"}
          </span>
          {showB ? (isRtl ? "הסתר מטריצה B" : "Hide Matrix B") : (isRtl ? "הצג מטריצה B (לכפל)" : "Show Matrix B (for A·B)")}
        </button>
      </div>

      {/* Matrix Inputs (Side by Side) */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12">
        <MatrixInputWidget label="A" size={size} data={matA} onChange={(r, c, v) => updateCell("A", r, c, v)} isRtl={isRtl} />
        {showB && (
          <div className="flex items-center gap-8">
            <div className="text-outline-variant text-3xl font-bold flex items-center justify-center self-center shrink-0">
              <span className="material-symbols-outlined text-3xl">close</span>
            </div>
            <MatrixInputWidget label="B" size={size} data={matB} onChange={(r, c, v) => updateCell("B", r, c, v)} isRtl={isRtl} />
          </div>
        )}
      </div>

      {/* Operations Toolbar */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
          {isRtl ? "פעולות חישוב" : "Operations"}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { op: "det", label: "det(A)", icon: "calculate" },
            { op: "inv", label: "A⁻¹", icon: "swap_horiz" },
            { op: "eigen", label: isRtl ? "ערכים עצמיים" : "Eigenvalues", icon: "star" },
            { op: "rref", label: "RREF", icon: "table_rows" },
            { op: "rank", label: isRtl ? "דרגה וגרעין" : "Rank & Nullity", icon: "format_list_numbered" },
            { op: "transpose", label: "Aᵀ", icon: "flip" },
            { op: "trace", label: "tr(A)", icon: "diagonal_line" },
            ...(showB ? [{ op: "mul", label: "A · B", icon: "close" }] : []),
          ].map((btn) => (
            <button
              key={btn.op}
              onClick={() => compute(btn.op)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-4.5 py-2.5 text-sm font-semibold text-on-primary-container hover:bg-primary-container/85 active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Panel */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-sm">output</span>
            {isRtl ? "תוצאות החישוב" : "Calculation Results"}
          </div>

          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low/75 p-4 border border-outline-variant/20 transition-all">
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-2 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  {r.label}
                </span>
                <div className="overflow-x-auto text-base select-all text-on-surface py-1">
                  {r.latex ? (
                    <div className="my-1">
                      <SafeLatex tex={r.latex} />
                    </div>
                  ) : (
                    <span className="font-mono text-sm">{r.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* RREF Stepper (Timeline) */}
          {rrefSteps.length > 0 && (
            <div className="mt-6 border-t border-outline-variant/20 pt-5 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">timeline</span>
                {isRtl ? "שלבי דירוג המטריצה (RREF)" : "Row Reduction Stepper"}
              </div>
              
              <div className="relative pl-6 border-l-2 border-outline-variant/30 space-y-5 py-2 ml-3" dir="ltr">
                {rrefSteps.map((step, i) => (
                  <div key={i} className="relative">
                    {/* Circle Node */}
                    <span className="absolute -left-[31px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary text-white text-[9px] font-bold shadow-md shadow-secondary/20">
                      {i + 1}
                    </span>
                    {/* Step Content */}
                    <div className="bg-surface-container-low/60 rounded-xl p-3.5 border border-outline-variant/20 inline-flex items-center gap-4 hover:border-secondary/30 transition-colors">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wide">Step {i+1}</span>
                      <div className="text-sm font-mono bg-surface-container-lowest border border-outline-variant/10 rounded px-2.5 py-1">
                        <SafeLatex tex={step} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatrixInputWidget({
  label, size, data, onChange, isRtl
}: { label: string; size: number; data: MatrixData; onChange: (r: number, c: number, v: string) => void; isRtl: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {isRtl ? `מטריצה ${label}` : `Matrix ${label}`}
      </span>
      
      {/* Mathematical Bracket Layout */}
      <div className="flex items-stretch gap-1.5 relative py-1" dir="ltr">
        {/* Left bracket */}
        <div className="w-2.5 border-t-2 border-b-2 border-l-2 border-outline-variant/80 rounded-l shrink-0" />
        
        {/* Grid Cells */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {Array.from({ length: size }).map((_, r) =>
            Array.from({ length: size }).map((_, c) => (
              <input
                key={`${r}-${c}`}
                type="number"
                step="any"
                value={data[r]?.[c] ?? 0}
                onChange={(e) => onChange(r, c, e.target.value)}
                className="w-15 bg-surface-container-low hover:bg-surface-container px-2 py-2 text-center text-sm font-mono font-bold text-on-surface rounded-lg border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
              />
            ))
          )}
        </div>

        {/* Right bracket */}
        <div className="w-2.5 border-t-2 border-b-2 border-r-2 border-outline-variant/80 rounded-r shrink-0" />
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
