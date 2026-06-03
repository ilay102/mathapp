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

  // SVG parameters
  const cx = 140, cy = 140;

  // Dynamic Scale
  const allPoints = [z1, z2, add, mul, ...roots.map((r) => ({ re: r.re, im: r.im }))];
  const maxVal = Math.max(1, ...allPoints.map((p) => Math.max(Math.abs(p.re), Math.abs(p.im))));
  const scale = 100 / maxVal;

  const toSvg = (re: number, im: number) => ({
    x: cx + re * scale,
    y: cy - im * scale
  });

  const getLabelProps = (re: number, im: number) => {
    const sx = re * scale;
    const sy = -im * scale;
    const len = Math.sqrt(sx * sx + sy * sy);
    const ox = len > 0 ? (sx / len) * 14 : 0;
    const oy = len > 0 ? (sy / len) * 14 : 0;
    const tx = cx + sx + ox;
    const ty = cy + sy + oy + 3;
    const anchor = ox > 2 ? "start" : ox < -2 ? "end" : "middle";
    return { x: tx, y: ty, textAnchor: anchor as "start" | "end" | "middle" };
  };

  // Radial angles for the polar grid (in degrees)
  const polarGridAngles = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20">
          <span className="material-symbols-outlined text-2xl">rotate_right</span>
        </div>
        <div>
          <h2 className="note-title text-2xl font-bold text-on-surface">
            {isRtl ? "מחשבון מספרים מרוכבים" : "Complex Number Calculator"}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {isRtl ? "מעבר בין הצגות, מציאת שורשים וציור במישור המרוכב" : "Rectangular ↔ polar forms, nth roots, and Argand plane plotting"}
          </p>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComplexInputCard
          label={<InlineMath math="z_1" />}
          re={a}
          im={b}
          onReChange={setA}
          onImChange={setB}
          colorClass="border-indigo-500/30 focus-within:border-indigo-500"
          accentColor="#6366f1"
        />
        <ComplexInputCard
          label={<InlineMath math="z_2" />}
          re={c}
          im={d}
          onReChange={setC}
          onImChange={setD}
          colorClass="border-pink-500/30 focus-within:border-pink-500"
          accentColor="#ec4899"
        />
      </div>

      {/* Results and Graphical Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Results Panel (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-sm">bar_chart</span>
            {isRtl ? "תוצאות וחישובים" : "Calculated Outputs"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultRow label={<InlineMath math="|z_1|" />} title={isRtl ? "ערך מוחלט (רדיוס)" : "Modulus"} value={fmt(r1)} />
            <ResultRow label={<InlineMath math="\text{arg}(z_1)" />} title={isRtl ? "ארגומנט (זווית)" : "Argument"} value={`${fmt(theta1)} rad (${fmt(thetaDeg1)}°)`} />
            <ResultRow label={isRtl ? "צורה פולרית" : "Polar form"} title="" value="" latex={`${fmt(r1)} e^{${fmt(theta1)} i}`} />
            <ResultRow label={<InlineMath math="\overline{z_1}" />} title={isRtl ? "צמוד מרוכב" : "Conjugate"} value={fmtComplex(conj1.re, conj1.im)} />
          </div>

          <div className="h-px bg-outline-variant/20 my-2" />

          <div className="space-y-2.5">
            <ResultRow label={<InlineMath math="z_1 + z_2" />} value={fmtComplex(add.re, add.im)} />
            <ResultRow label={<InlineMath math="z_1 - z_2" />} value={fmtComplex(sub.re, sub.im)} />
            <ResultRow label={<InlineMath math="z_1 \cdot z_2" />} value={fmtComplex(mul.re, mul.im)} />
            <ResultRow label={<InlineMath math="z_1 / z_2" />} value={div ? fmtComplex(div.re, div.im) : (isRtl ? "חלוקה באפס" : "Division by zero")} />
          </div>

          {/* nth Roots input and list */}
          <div className="border-t border-outline-variant/20 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">
                {isRtl ? "שורש מסדר n של z₁:" : "nth roots of z₁:"}
              </span>
              <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-lg border border-outline-variant/30">
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={nthRoot}
                  onChange={(e) => setNthRoot(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                  className="w-12 bg-surface-container-lowest text-center text-xs font-mono font-bold text-on-surface rounded border border-outline-variant/40 py-0.5 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roots.map((root, k) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low/50 px-3 py-2 border border-outline-variant/10 font-mono text-xs">
                  <span className="text-secondary font-bold">w{subscript(k)}</span>
                  <span className="text-on-surface">{fmtComplex(root.re, root.im)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Argand Diagram Visualizer (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-sm">scatter_plot</span>
              {isRtl ? "דיאגרמת ארגאנד (מישור מרוכב)" : "Argand Complex Plane"}
            </div>

            <div className="relative rounded-xl bg-surface-container-low/30 border border-outline-variant/20 p-2 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto select-none">
                <defs>
                  {/* Dotted lines for radial lines */}
                  <pattern id="grid-dots" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.5" fill="#bbb" opacity="0.3" />
                  </pattern>
                </defs>

                {/* Grid dots background */}
                <rect width="100%" height="100%" fill="url(#grid-dots)" />

                {/* Polar Radar Grid: concentric circles representing magnitude circles */}
                {[0.25, 0.5, 0.75, 1.0].map((scaleFactor, index) => {
                  const circleRadius = scaleFactor * 105;
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={circleRadius}
                      fill="none"
                      stroke="#d0d4dc"
                      strokeWidth={index === 3 ? 1 : 0.6}
                      strokeDasharray={index === 3 ? "none" : "2 3"}
                    />
                  );
                })}

                {/* Polar Radar Grid: radial lines for degrees */}
                {polarGridAngles.map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const targetX = cx + 110 * Math.cos(rad);
                  const targetY = cy - 110 * Math.sin(rad);
                  return (
                    <line
                      key={deg}
                      x1={cx}
                      y1={cy}
                      x2={targetX}
                      y2={targetY}
                      stroke="#e1e3e8"
                      strokeWidth={0.5}
                      strokeDasharray="2 4"
                    />
                  );
                })}

                {/* Coordinate Axes */}
                <line x1="10" y1={cy} x2="270" y2={cy} stroke="#7f8c8d" strokeWidth={1} />
                <line x1={cx} y1="270" x2={cx} y2="10" stroke="#7f8c8d" strokeWidth={1} />
                <text x="270" y={cy - 6} fontSize={8} fill="#7f8c8d" textAnchor="end">Re</text>
                <text x={cx + 6} y="18" fontSize={8} fill="#7f8c8d">Im</text>

                {/* Roots polygonal trace lines (joining roots together to show root structure) */}
                {roots.length > 1 && (
                  <polygon
                    points={roots.map((r) => `${toSvg(r.re, r.im).x},${toSvg(r.re, r.im).y}`).join(" ")}
                    fill="rgba(245, 158, 11, 0.04)"
                    stroke="rgba(245, 158, 11, 0.4)"
                    strokeWidth={0.8}
                    strokeDasharray="3 3"
                  />
                )}

                {/* origin-to-z1 line */}
                <line x1={cx} y1={cy} x2={toSvg(z1.re, z1.im).x} y2={toSvg(z1.re, z1.im).y} stroke="#6366f1" strokeWidth={1.5} opacity={0.8} />
                {/* z1 point */}
                <circle cx={toSvg(z1.re, z1.im).x} cy={toSvg(z1.re, z1.im).y} r={4.5} fill="#6366f1" stroke="white" strokeWidth={1} className="drop-shadow-sm" />
                <text {...getLabelProps(z1.re, z1.im)} fontSize={10} fill="#6366f1" fontWeight="bold">z₁</text>

                {/* origin-to-z2 line */}
                <line x1={cx} y1={cy} x2={toSvg(z2.re, z2.im).x} y2={toSvg(z2.re, z2.im).y} stroke="#ec4899" strokeWidth={1.5} opacity={0.8} />
                {/* z2 point */}
                <circle cx={toSvg(z2.re, z2.im).x} cy={toSvg(z2.re, z2.im).y} r={4.5} fill="#ec4899" stroke="white" strokeWidth={1} className="drop-shadow-sm" />
                <text {...getLabelProps(z2.re, z2.im)} fontSize={10} fill="#ec4899" fontWeight="bold">z₂</text>

                {/* Product z1*z2 */}
                <circle cx={toSvg(mul.re, mul.im).x} cy={toSvg(mul.re, mul.im).y} r={4.5} fill="#10b981" stroke="white" strokeWidth={1} />
                <text {...getLabelProps(mul.re, mul.im)} fontSize={9} fill="#10b981" fontWeight="semibold">z₁·z₂</text>

                {/* nth Roots mapping */}
                {roots.map((root, k) => (
                  <g key={k}>
                    {/* Radially connect roots to origin */}
                    <line x1={cx} y1={cy} x2={toSvg(root.re, root.im).x} y2={toSvg(root.re, root.im).y} stroke="#f59e0b" strokeWidth={0.5} opacity={0.4} />
                    <circle cx={toSvg(root.re, root.im).x} cy={toSvg(root.re, root.im).y} r={3.5} fill="#f59e0b" stroke="white" strokeWidth={0.7} />
                    {k < 6 && (
                      <text
                        {...getLabelProps(root.re, root.im)}
                        fontSize={7.5}
                        fill="#d97706"
                        fontWeight="medium"
                      >
                        w{subscript(k)}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Color Indicators */}
          <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t border-outline-variant/10 text-[10px] font-medium text-on-surface-variant" dir="ltr">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#6366f1]" /> <InlineMath math="z_1" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#ec4899]" /> <InlineMath math="z_2" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" /> <InlineMath math="z_1 \cdot z_2" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> {isRtl ? "שורשים" : "Roots"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type ComplexInputProps = {
  label: React.ReactNode;
  re: number;
  im: number;
  onReChange: (val: number) => void;
  onImChange: (val: number) => void;
  colorClass: string;
  accentColor: string;
};

function ComplexInputCard({ label, re, im, onReChange, onImChange, colorClass, accentColor }: ComplexInputProps) {
  return (
    <div className={`rounded-2xl border bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
          {label}
        </span>
        <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Complex</span>
      </div>

      <div className="flex items-center justify-center gap-3 mt-2" dir="ltr">
        <div className="relative">
          <input
            type="number"
            step="any"
            value={re}
            onChange={(e) => onReChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-surface-container-low hover:bg-surface-container px-3 py-2 text-center text-base font-mono font-bold text-on-surface rounded-lg border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
          />
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] text-outline font-bold uppercase tracking-wider">Real (a)</span>
        </div>

        <span className="text-outline-variant font-bold text-lg">+</span>

        <div className="relative">
          <input
            type="number"
            step="any"
            value={im}
            onChange={(e) => onImChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-surface-container-low hover:bg-surface-container px-3 py-2 text-center text-base font-mono font-bold text-on-surface rounded-lg border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
          />
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] text-outline font-bold uppercase tracking-wider">Imag (b)</span>
        </div>

        <span className="text-outline font-mono font-bold text-lg">i</span>
      </div>
    </div>
  );
}

type ResultRowProps = {
  label: React.ReactNode;
  title?: React.ReactNode;
  value: string;
  latex?: string;
};

function ResultRow({ label, title, value, latex }: ResultRowProps) {
  return (
    <div className="group flex flex-col justify-between gap-1 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low/75 p-3.5 border border-outline-variant/20 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center rounded-lg bg-surface-container px-2.5 py-1 text-xs font-bold text-primary shrink-0 border border-outline-variant/20 shadow-sm min-w-[44px] text-center text-nowrap">
            {label}
          </span>
          {title && <span className="text-xs font-bold text-on-surface-variant">{title}</span>}
        </div>
        <span className="text-sm font-semibold select-all text-end text-on-surface overflow-x-auto py-0.5">
          {latex ? (
            <InlineMath math={latex} />
          ) : (
            <span className="font-mono text-xs">{value}</span>
          )}
        </span>
      </div>
    </div>
  );
}

function subscript(n: number): string {
  const subs = "₀₁₂₃₄₅₆₇₈₉";
  return String(n).split("").map((d) => subs[parseInt(d)] || d).join("");
}
