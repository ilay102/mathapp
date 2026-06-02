"use client";

import { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtComplex(re: number, im: number): string {
  if (Math.abs(im) < 1e-9) return fmt(re);
  if (Math.abs(re) < 1e-9) return im === 1 ? "i" : im === -1 ? "-i" : `${fmt(im)}i`;
  const sign = im > 0 ? "+" : "-";
  const absIm = Math.abs(im);
  return `${fmt(re)} ${sign} ${absIm === 1 ? "" : fmt(absIm)}i`;
}

export default function ComplexCalc({ lang }: Props) {
  const isRtl = lang === "he";
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [c, setC] = useState(1);
  const [d, setD] = useState(1);
  const [nthRoot, setNthRoot] = useState(3);

  const z1 = { re: a, im: b };
  const z2 = { re: c, im: d };

  // Conversions
  const r1 = Math.sqrt(a * a + b * b);
  const theta1 = Math.atan2(b, a);
  const r2 = Math.sqrt(c * c + d * d);
  const theta2 = Math.atan2(d, c);
  const thetaDeg1 = (theta1 * 180) / Math.PI;
  const thetaDeg2 = (theta2 * 180) / Math.PI;

  // Operations
  const add = { re: a + c, im: b + d };
  const sub = { re: a - c, im: b - d };
  const mul = { re: a * c - b * d, im: a * d + b * c };
  const divDenom = c * c + d * d;
  const div = divDenom > 1e-12 ? { re: (a * c + b * d) / divDenom, im: (b * c - a * d) / divDenom } : null;
  const conj1 = { re: a, im: -b };

  // nth roots of z1
  const roots = useMemo(() => {
    const rootR = Math.pow(r1, 1 / nthRoot);
    return Array.from({ length: nthRoot }, (_, k) => {
      const angle = (theta1 + 2 * Math.PI * k) / nthRoot;
      return {
        re: rootR * Math.cos(angle),
        im: rootR * Math.sin(angle),
        r: rootR,
        theta: angle,
      };
    });
  }, [a, b, nthRoot, r1, theta1]);

  // Argand diagram params
  const allPoints = [z1, z2, add, mul, ...roots.map((r) => ({ re: r.re, im: r.im }))];
  const maxVal = Math.max(1, ...allPoints.map((p) => Math.max(Math.abs(p.re), Math.abs(p.im))));
  const scale = 100 / (maxVal * 1.3);
  const cx = 130, cy = 130;
  const toSvg = (re: number, im: number) => ({ x: cx + re * scale, y: cy - im * scale });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md">
          <span className="material-symbols-outlined">rotate_right</span>
        </div>
        <h2 className="note-title text-xl font-bold text-on-surface">
          {isRtl ? "מחשבון מספרים מרוכבים" : "Complex Number Calculator"}
        </h2>
      </div>

      {/* Inputs */}
      <div className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <span className="text-sm font-bold text-on-surface">z₁ = a + bi</span>
          <div className="flex items-center gap-2">
            <input type="number" step="any" value={a} onChange={(e) => setA(parseFloat(e.target.value) || 0)}
              className="w-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono focus:border-primary focus:outline-none" />
            <span className="text-on-surface-variant font-mono">+</span>
            <input type="number" step="any" value={b} onChange={(e) => setB(parseFloat(e.target.value) || 0)}
              className="w-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono focus:border-primary focus:outline-none" />
            <span className="text-on-surface-variant font-mono font-bold">i</span>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-bold text-on-surface">z₂ = c + di</span>
          <div className="flex items-center gap-2">
            <input type="number" step="any" value={c} onChange={(e) => setC(parseFloat(e.target.value) || 0)}
              className="w-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono focus:border-primary focus:outline-none" />
            <span className="text-on-surface-variant font-mono">+</span>
            <input type="number" step="any" value={d} onChange={(e) => setD(parseFloat(e.target.value) || 0)}
              className="w-20 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono focus:border-primary focus:outline-none" />
            <span className="text-on-surface-variant font-mono font-bold">i</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Table */}
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">output</span>
            {isRtl ? "תוצאות" : "Results"}
          </div>

          <div className="space-y-2 text-sm">
            <Row label={isRtl ? "ערך מוחלט z₁" : "|z₁|"} value={fmt(r1)} />
            <Row label={isRtl ? "ארגומנט z₁" : "arg(z₁)"} value={`${fmt(theta1)} rad (${fmt(thetaDeg1)}°)`} />
            <Row label={isRtl ? "צורה פולרית z₁" : "Polar z₁"} latex={`${fmt(r1)} \\cdot e^{${fmt(theta1)}i}`} />
            <Row label={isRtl ? "צמוד z₁" : "Conjugate z₁"} value={fmtComplex(conj1.re, conj1.im)} />
            <div className="h-px bg-outline-variant/30" />
            <Row label="z₁ + z₂" value={fmtComplex(add.re, add.im)} />
            <Row label="z₁ − z₂" value={fmtComplex(sub.re, sub.im)} />
            <Row label="z₁ · z₂" value={fmtComplex(mul.re, mul.im)} />
            <Row label="z₁ / z₂" value={div ? fmtComplex(div.re, div.im) : (isRtl ? "חלוקה באפס" : "Division by zero")} />
          </div>

          {/* nth Roots */}
          <div className="border-t border-outline-variant/30 pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">{isRtl ? "שורש מסדר n של z₁:" : "nth roots of z₁:"}</span>
              <input type="number" min={2} max={12} value={nthRoot} onChange={(e) => setNthRoot(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                className="w-14 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1 text-center text-xs font-mono focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1">
              {roots.map((root, k) => (
                <div key={k} className="flex items-center gap-2 rounded bg-surface-container-low/60 px-2 py-1 text-xs font-mono">
                  <span className="text-primary font-bold min-w-[20px]">z{subscript(k)}</span>
                  <span className="text-on-surface">{fmtComplex(root.re, root.im)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Argand Diagram */}
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">scatter_plot</span>
            {isRtl ? "דיאגרמת ארגאנד" : "Argand Diagram"}
          </div>
          <svg viewBox="0 0 260 260" className="w-full max-w-[300px] mx-auto">
            {/* Grid */}
            <line x1={0} y1={cy} x2={260} y2={cy} stroke="#e0e0e0" strokeWidth={0.5} />
            <line x1={cx} y1={0} x2={cx} y2={260} stroke="#e0e0e0" strokeWidth={0.5} />
            {/* Axes labels */}
            <text x={255} y={cy - 5} fontSize={9} fill="#888" textAnchor="end">Re</text>
            <text x={cx + 5} y={10} fontSize={9} fill="#888">Im</text>

            {/* z1 point + line */}
            <line x1={cx} y1={cy} x2={toSvg(z1.re, z1.im).x} y2={toSvg(z1.re, z1.im).y} stroke="#6366f1" strokeWidth={1.5} />
            <circle cx={toSvg(z1.re, z1.im).x} cy={toSvg(z1.re, z1.im).y} r={4} fill="#6366f1" />
            <text x={toSvg(z1.re, z1.im).x + 6} y={toSvg(z1.re, z1.im).y - 6} fontSize={9} fill="#6366f1" fontWeight="bold">z₁</text>

            {/* z2 point + line */}
            <line x1={cx} y1={cy} x2={toSvg(z2.re, z2.im).x} y2={toSvg(z2.re, z2.im).y} stroke="#ec4899" strokeWidth={1.5} />
            <circle cx={toSvg(z2.re, z2.im).x} cy={toSvg(z2.re, z2.im).y} r={4} fill="#ec4899" />
            <text x={toSvg(z2.re, z2.im).x + 6} y={toSvg(z2.re, z2.im).y - 6} fontSize={9} fill="#ec4899" fontWeight="bold">z₂</text>

            {/* Product */}
            <circle cx={toSvg(mul.re, mul.im).x} cy={toSvg(mul.re, mul.im).y} r={3.5} fill="#10b981" stroke="white" strokeWidth={1} />
            <text x={toSvg(mul.re, mul.im).x + 6} y={toSvg(mul.re, mul.im).y - 6} fontSize={8} fill="#10b981">z₁·z₂</text>

            {/* nth Roots */}
            {roots.map((root, k) => (
              <g key={k}>
                <circle cx={toSvg(root.re, root.im).x} cy={toSvg(root.re, root.im).y} r={3} fill="#f59e0b" stroke="white" strokeWidth={0.8} />
                {k < 6 && (
                  <text x={toSvg(root.re, root.im).x + 5} y={toSvg(root.re, root.im).y + 10} fontSize={7} fill="#f59e0b">
                    w{subscript(k)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#6366f1]" /> z₁</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ec4899]" /> z₂</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" /> z₁·z₂</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> {isRtl ? "שורשים" : "roots"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, latex }: { label: string; value?: string; latex?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-surface-container-low/60 px-3 py-1.5">
      <span className="text-xs font-semibold text-on-surface-variant shrink-0">{label}</span>
      {latex ? (
        <span className="font-mono text-sm text-on-surface overflow-x-auto">
          <SafeLatex tex={latex} />
        </span>
      ) : (
        <span className="font-mono text-sm text-on-surface">{value}</span>
      )}
    </div>
  );
}

function subscript(n: number): string {
  const subs = "₀₁₂₃₄₅₆₇₈₉";
  return String(n).split("").map((d) => subs[parseInt(d)] || d).join("");
}

function SafeLatex({ tex }: { tex: string }) {
  try {
    return <InlineMath math={tex} />;
  } catch {
    return <code className="text-xs text-error">{tex}</code>;
  }
}
