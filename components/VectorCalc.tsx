"use client";

import { useState } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export default function VectorCalc({ lang }: Props) {
  const isRtl = lang === "he";
  const [dim, setDim] = useState<2 | 3>(3);
  const [u, setU] = useState([3, 4, 0]);
  const [v, setV] = useState([1, 2, 2]);

  const ux = u[0], uy = u[1], uz = u[2] || 0;
  const vx = v[0], vy = v[1], vz = v[2] || 0;

  const magU = Math.sqrt(ux * ux + uy * uy + (dim === 3 ? uz * uz : 0));
  const magV = Math.sqrt(vx * vx + vy * vy + (dim === 3 ? vz * vz : 0));
  const dot = ux * vx + uy * vy + (dim === 3 ? uz * vz : 0);
  const cross = dim === 3
    ? { x: uy * vz - uz * vy, y: uz * vx - ux * vz, z: ux * vy - uy * vx }
    : null;
  const magCross = cross ? Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) : Math.abs(ux * vy - uy * vx);
  const angleCos = magU > 0 && magV > 0 ? dot / (magU * magV) : 0;
  const angle = Math.acos(Math.max(-1, Math.min(1, angleCos)));
  const angleDeg = (angle * 180) / Math.PI;

  const unitU = magU > 0 ? { x: ux / magU, y: uy / magU, z: uz / magU } : { x: 0, y: 0, z: 0 };
  const projUV = magV > 0 ? dot / (magV * magV) : 0; // scalar projection factor
  const projVec = { x: projUV * vx, y: projUV * vy, z: projUV * vz };
  const add = { x: ux + vx, y: uy + vy, z: uz + vz };
  const sub = { x: ux - vx, y: uy - vy, z: uz - vz };

  const updateU = (i: number, val: string) => {
    setU((prev) => { const n = [...prev]; n[i] = parseFloat(val) || 0; return n; });
  };
  const updateV = (i: number, val: string) => {
    setV((prev) => { const n = [...prev]; n[i] = parseFloat(val) || 0; return n; });
  };

  // SVG dimensions
  const svgCx = 140, svgCy = 140;

  // Dynamic Scale: ensure vectors fill ~65-75% of the SVG diagram
  const allPts = [
    { x: ux, y: uy }, { x: vx, y: vy }, { x: add.x, y: add.y },
    { x: projVec.x, y: projVec.y },
  ];
  const maxCoord = Math.max(0.5, ...allPts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const svgScale = 100 / maxCoord;

  const toSvg = (x: number, y: number) => ({
    x: svgCx + x * svgScale,
    y: svgCy - y * svgScale
  });

  // Smart label position helper to prevent labels from rendering on top of arrow lines
  const getLabelProps = (x: number, y: number, text: string) => {
    const sx = x * svgScale;
    const sy = -y * svgScale;
    const len = Math.sqrt(sx * sx + sy * sy);
    const ox = len > 0 ? (sx / len) * 16 : 0;
    const oy = len > 0 ? (sy / len) * 16 : 0;
    const tx = svgCx + sx + ox;
    const ty = svgCy + sy + oy + 4; // slight vertical adjustment
    const anchor = ox > 2 ? "start" : ox < -2 ? "end" : "middle";
    return { x: tx, y: ty, textAnchor: anchor as "start" | "end" | "middle" };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20">
          <span className="material-symbols-outlined text-2xl">north_east</span>
        </div>
        <div>
          <h2 className="note-title text-2xl font-bold text-on-surface">
            {isRtl ? "מחשבון וקטורים" : "Vector Calculator"}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {isRtl ? "חישובים והדמיות של וקטורים בדו-מימד ותלת-מימד" : "Interactive 2D/3D vector analysis and projections"}
          </p>
        </div>
      </div>

      {/* Settings Row */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant font-medium">{isRtl ? "מימד:" : "Dimension:"}</span>
          <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline-variant/30">
            {([2, 3] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDim(d)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  dim === d ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vector Input Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VecInputCard
          label={<InlineMath math="\vec{u}" />}
          dim={dim}
          values={u}
          onChange={updateU}
          colorClass="border-indigo-500/30 focus-within:border-indigo-500"
          accentColor="#6366f1"
          lang={lang}
        />
        <VecInputCard
          label={<InlineMath math="\vec{v}" />}
          dim={dim}
          values={v}
          onChange={updateV}
          colorClass="border-pink-500/30 focus-within:border-pink-500"
          accentColor="#ec4899"
          lang={lang}
        />
      </div>

      {/* Main Analysis and Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Results Panel (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
            <span className="material-symbols-outlined text-sm">bar_chart</span>
            {isRtl ? "תוצאות וחישובים" : "Calculated Properties"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultRow label={<InlineMath math="\|\vec{u}\|" />} value={fmt(magU)} />
            <ResultRow label={<InlineMath math="\|\vec{v}\|" />} value={fmt(magV)} />
          </div>

          <div className="h-px bg-outline-variant/20 my-2" />

          <div className="space-y-3">
            <ResultRow
              label={<InlineMath math="\vec{u} \cdot \vec{v}" />}
              title={isRtl ? "מכפלה סקלרית" : "Dot Product"}
              value={fmt(dot)}
              description={isRtl ? "מכפלת האורכים והקוסינוס ביניהם" : "Scalar product of magnitudes and angle cos"}
            />

            {dim === 3 && cross ? (
              <ResultRow
                label={<InlineMath math="\vec{u} \times \vec{v}" />}
                title={isRtl ? "מכפלה וקטורית" : "Cross Product"}
                value={`(${fmt(cross.x)}, ${fmt(cross.y)}, ${fmt(cross.z)})`}
                description={isRtl ? "וקטור מאונך לשני הוקטורים" : "Vector perpendicular to both vectors"}
              />
            ) : (
              <ResultRow
                label={<InlineMath math="\|\vec{u} \times \vec{v}\|" />}
                title={isRtl ? "שטח מקבילית" : "Parallelogram Area"}
                value={fmt(magCross)}
                description={isRtl ? "שטח המקבילית הנוצרת על ידי הוקטורים" : "Area of the parallelogram spanned by vectors"}
              />
            )}

            <ResultRow
              label={isRtl ? "זווית ביניהם" : "Angle Between"}
              title={<InlineMath math="\theta" />}
              value={`${fmt(angle)} rad (${fmt(angleDeg)}°)`}
              description={Math.abs(dot) < 1e-9 ? (isRtl ? "מאונכים (90 מעלות)" : "Orthogonal (90°)") : undefined}
            />

            <ResultRow
              label={isRtl ? "אורתוגונליים?" : "Orthogonal?"}
              title=""
              value={Math.abs(dot) < 1e-9 ? "✓ Yes" : "✗ No"}
              valueClass={Math.abs(dot) < 1e-9 ? "text-emerald-600 font-bold" : "text-on-surface-variant"}
            />
          </div>

          <div className="h-px bg-outline-variant/20 my-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultRow
              label={<InlineMath math="\hat{u}" />}
              title={isRtl ? "וקטור יחידה" : "Unit Vector"}
              value={`(${fmt(unitU.x)}, ${fmt(unitU.y)}${dim === 3 ? `, ${fmt(unitU.z)}` : ""})`}
            />
            <ResultRow
              label={<InlineMath math="\text{proj}_{\vec{v}}(\vec{u})" />}
              title={isRtl ? "הטלה" : "Vector Projection"}
              value={`(${fmt(projVec.x)}, ${fmt(projVec.y)}${dim === 3 ? `, ${fmt(projVec.z)}` : ""})`}
            />
            <ResultRow
              label={<InlineMath math="\vec{u} + \vec{v}" />}
              title={isRtl ? "חיבור וקטורים" : "Vector Sum"}
              value={`(${fmt(add.x)}, ${fmt(add.y)}${dim === 3 ? `, ${fmt(add.z)}` : ""})`}
            />
            <ResultRow
              label={<InlineMath math="\vec{u} - \vec{v}" />}
              title={isRtl ? "חיסור וקטורים" : "Vector Difference"}
              value={`(${fmt(sub.x)}, ${fmt(sub.y)}${dim === 3 ? `, ${fmt(sub.z)}` : ""})`}
            />
          </div>
        </div>

        {/* Vector Diagram Visualizer (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
              <span className="material-symbols-outlined text-sm">draw</span>
              {isRtl ? "תרשים וקטורי (דו-מימד)" : "2D Projection Visualizer"}
            </div>
            
            <div className="relative rounded-xl bg-surface-container-low/30 border border-outline-variant/20 p-2 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto select-none">
                {/* SVG Definitions for patterns and markers */}
                <defs>
                  {/* Dotted Grid Pattern */}
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#e0e0e0" opacity="0.8" />
                  </pattern>
                  {/* Arrow markers for vectors */}
                  <marker id="arrow-u" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,2 L10,5 L0,8 z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-v" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,2 L10,5 L0,8 z" fill="#ec4899" />
                  </marker>
                  <marker id="arrow-sum" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,2 L10,5 L0,8 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-axis" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M0,2 L10,5 L0,8 z" fill="#888" />
                  </marker>
                </defs>

                {/* Grid Background */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Axes */}
                <line x1="10" y1={svgCy} x2="270" y2={svgCy} stroke="#888" strokeWidth={1} markerEnd="url(#arrow-axis)" />
                <line x1={svgCx} y1="270" x2={svgCx} y2="10" stroke="#888" strokeWidth={1} markerEnd="url(#arrow-axis)" />
                <text x="270" y={svgCy + 12} fontSize={9} fill="#888" textAnchor="end">x</text>
                <text x={svgCx - 10} y="15" fontSize={9} fill="#888">y</text>

                {/* Projection components dashed line */}
                <line x1={toSvg(ux, uy).x} y1={toSvg(ux, uy).y} x2={toSvg(projVec.x, projVec.y).x} y2={toSvg(projVec.x, projVec.y).y} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3 3" />

                {/* Vector sum tip guidelines */}
                <line x1={toSvg(ux, uy).x} y1={toSvg(ux, uy).y} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} stroke="#10b981" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.6} />
                <line x1={toSvg(vx, vy).x} y1={toSvg(vx, vy).y} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} stroke="#10b981" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.6} />

                {/* Scalar Projection Line (bold line on top of v) */}
                <line x1={svgCx} y1={svgCy} x2={toSvg(projVec.x, projVec.y).x} y2={toSvg(projVec.x, projVec.y).y} stroke="#f59e0b" strokeWidth={3} opacity={0.85} strokeLinecap="round" />

                {/* u vector (blue) */}
                <line x1={svgCx} y1={svgCy} x2={toSvg(ux, uy).x} y2={toSvg(ux, uy).y} stroke="#6366f1" strokeWidth={2.5} markerEnd="url(#arrow-u)" />
                
                {/* v vector (pink) */}
                <line x1={svgCx} y1={svgCy} x2={toSvg(vx, vy).x} y2={toSvg(vx, vy).y} stroke="#ec4899" strokeWidth={2.5} markerEnd="url(#arrow-v)" />

                {/* u + v vector (green) */}
                <line x1={svgCx} y1={svgCy} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} stroke="#10b981" strokeWidth={2.5} markerEnd="url(#arrow-sum)" />

                {/* Smart Vector Labels */}
                <text {...getLabelProps(ux, uy, "u")} fontSize={10} fill="#6366f1" fontWeight="bold">u⃗</text>
                <text {...getLabelProps(vx, vy, "v")} fontSize={10} fill="#ec4899" fontWeight="bold">v⃗</text>
                <text {...getLabelProps(add.x, add.y, "u+v")} fontSize={10} fill="#10b981" fontWeight="bold">u⃗+v⃗</text>
                
                {projUV !== 0 && (
                  <text {...getLabelProps(projVec.x, projVec.y, "proj")} fontSize={9} fill="#d97706" fontWeight="semibold">proj</text>
                )}
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-4 pt-3 border-t border-outline-variant/10 text-[10px] font-medium text-on-surface-variant" dir="ltr">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#6366f1]" /> <InlineMath math="\vec{u}" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#ec4899]" /> <InlineMath math="\vec{v}" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" /> <InlineMath math="\vec{u}+\vec{v}" /></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> <InlineMath math="\text{proj}_{\vec{v}}(\vec{u})" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

type InputCardProps = {
  label: React.ReactNode;
  dim: 2 | 3;
  values: number[];
  onChange: (i: number, val: string) => void;
  colorClass: string;
  accentColor: string;
  lang: Lang;
};

function VecInputCard({ label, dim, values, onChange, colorClass, accentColor, lang }: InputCardProps) {
  const isRtl = lang === "he";
  return (
    <div className={`rounded-2xl border bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
          {label}
        </span>
        <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">Vector</span>
      </div>
      
      {/* Mathematical Bracket Grid Input */}
      <div className="flex items-center justify-center gap-1.5 mt-2" dir="ltr">
        {/* Left tall bracket */}
        <div className="w-2.5 h-12 border-t-2 border-b-2 border-l-2 border-outline-variant/60 rounded-l" />
        
        <div className="flex items-center gap-2">
          {Array.from({ length: dim }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={values[i] ?? 0}
                  onChange={(e) => onChange(i, e.target.value)}
                  className="w-18 bg-surface-container-low hover:bg-surface-container px-2 py-2 text-center text-base font-mono font-bold text-on-surface rounded-lg border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] text-outline font-bold uppercase tracking-wider">
                  {i === 0 ? "x" : i === 1 ? "y" : "z"}
                </span>
              </div>
              {i < dim - 1 && <span className="text-outline-variant font-bold ml-1.5">,</span>}
            </div>
          ))}
        </div>

        {/* Right tall bracket */}
        <div className="w-2.5 h-12 border-t-2 border-b-2 border-r-2 border-outline-variant/60 rounded-r" />
      </div>
    </div>
  );
}

type ResultRowProps = {
  label: React.ReactNode;
  title?: React.ReactNode;
  value: string;
  description?: string;
  valueClass?: string;
};

function ResultRow({ label, title, value, description, valueClass = "text-on-surface font-mono" }: ResultRowProps) {
  return (
    <div className="group flex flex-col justify-between gap-1 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low/75 p-3.5 border border-outline-variant/20 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center rounded-lg bg-surface-container px-2.5 py-1 text-xs font-bold text-primary shrink-0 border border-outline-variant/20 shadow-sm min-w-[44px] text-center text-nowrap">
            {label}
          </span>
          {title && <span className="text-xs font-bold text-on-surface-variant">{title}</span>}
        </div>
        <span className={`text-sm font-semibold select-all text-end ${valueClass}`}>{value}</span>
      </div>
      {description && <p className="text-[10px] text-outline leading-tight mt-1">{description}</p>}
    </div>
  );
}
