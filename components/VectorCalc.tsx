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

  // SVG visualization (2D projection)
  const allPts = [
    { x: ux, y: uy }, { x: vx, y: vy }, { x: add.x, y: add.y },
    ...(cross ? [{ x: cross.x, y: cross.y }] : []),
    { x: projVec.x, y: projVec.y },
  ];
  const maxCoord = Math.max(1, ...allPts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const svgScale = 90 / (maxCoord * 1.3);
  const svgCx = 130, svgCy = 130;
  const toSvg = (x: number, y: number) => ({ x: svgCx + x * svgScale, y: svgCy - y * svgScale });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md">
          <span className="material-symbols-outlined">north_east</span>
        </div>
        <h2 className="note-title text-xl font-bold text-on-surface">
          {isRtl ? "מחשבון וקטורים" : "Vector Calculator"}
        </h2>
      </div>

      {/* Dimension toggle */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-on-surface-variant font-medium">{isRtl ? "מימד:" : "Dimension:"}</span>
        {([2, 3] as const).map((d) => (
          <button key={d} onClick={() => setDim(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              dim === d ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {d}D
          </button>
        ))}
      </div>

      {/* Vector Inputs */}
      <div className="flex flex-wrap gap-6">
        <VecInput label="u⃗" dim={dim} values={u} onChange={updateU} color="#6366f1" />
        <VecInput label="v⃗" dim={dim} values={v} onChange={updateV} color="#ec4899" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results */}
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">output</span>
            {isRtl ? "תוצאות" : "Results"}
          </div>

          <Row label="|u⃗|" value={fmt(magU)} />
          <Row label="|v⃗|" value={fmt(magV)} />
          <div className="h-px bg-outline-variant/30" />

          <Row label={isRtl ? "מכפלה סקלרית" : "Dot product"} value={`u⃗ · v⃗ = ${fmt(dot)}`} />
          {dim === 3 && cross && (
            <Row label={isRtl ? "מכפלה וקטורית" : "Cross product"} value={`u⃗ × v⃗ = (${fmt(cross.x)}, ${fmt(cross.y)}, ${fmt(cross.z)})`} />
          )}
          {dim === 2 && (
            <Row label={isRtl ? "|u⃗ × v⃗| (שטח מקבילית)" : "|u⃗ × v⃗| (parallelogram area)"} value={fmt(magCross)} />
          )}
          <Row label={isRtl ? "זווית" : "Angle"} value={`${fmt(angle)} rad = ${fmt(angleDeg)}°`} />
          <Row label={isRtl ? "אורתוגונליים?" : "Orthogonal?"} value={Math.abs(dot) < 1e-9 ? "✓ Yes" : "✗ No"} />
          <div className="h-px bg-outline-variant/30" />

          <Row label={isRtl ? "וקטור יחידה û" : "Unit vector û"} value={`(${fmt(unitU.x)}, ${fmt(unitU.y)}${dim === 3 ? `, ${fmt(unitU.z)}` : ""})`} />
          <Row label={isRtl ? "הטלת u⃗ על v⃗" : "proj_v⃗(u⃗)"} value={`(${fmt(projVec.x)}, ${fmt(projVec.y)}${dim === 3 ? `, ${fmt(projVec.z)}` : ""})`} />
          <Row label="u⃗ + v⃗" value={`(${fmt(add.x)}, ${fmt(add.y)}${dim === 3 ? `, ${fmt(add.z)}` : ""})`} />
          <Row label="u⃗ − v⃗" value={`(${fmt(sub.x)}, ${fmt(sub.y)}${dim === 3 ? `, ${fmt(sub.z)}` : ""})`} />
        </div>

        {/* Vector Diagram */}
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">draw</span>
            {isRtl ? "תרשים וקטורים (הטלה 2D)" : "Vector Diagram (2D projection)"}
          </div>
          <svg viewBox="0 0 260 260" className="w-full max-w-[300px] mx-auto">
            {/* Grid */}
            <line x1={0} y1={svgCy} x2={260} y2={svgCy} stroke="#e0e0e0" strokeWidth={0.5} />
            <line x1={svgCx} y1={0} x2={svgCx} y2={260} stroke="#e0e0e0" strokeWidth={0.5} />

            {/* u vector (blue) */}
            <Arrow x1={svgCx} y1={svgCy} x2={toSvg(ux, uy).x} y2={toSvg(ux, uy).y} color="#6366f1" />
            <text x={toSvg(ux, uy).x + 5} y={toSvg(ux, uy).y - 5} fontSize={10} fill="#6366f1" fontWeight="bold">u⃗</text>

            {/* v vector (pink) */}
            <Arrow x1={svgCx} y1={svgCy} x2={toSvg(vx, vy).x} y2={toSvg(vx, vy).y} color="#ec4899" />
            <text x={toSvg(vx, vy).x + 5} y={toSvg(vx, vy).y - 5} fontSize={10} fill="#ec4899" fontWeight="bold">v⃗</text>

            {/* u + v (green, dashed from tips) */}
            <line x1={toSvg(ux, uy).x} y1={toSvg(ux, uy).y} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} stroke="#10b981" strokeWidth={1} strokeDasharray="3 2" />
            <line x1={toSvg(vx, vy).x} y1={toSvg(vx, vy).y} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} stroke="#10b981" strokeWidth={1} strokeDasharray="3 2" />
            <Arrow x1={svgCx} y1={svgCy} x2={toSvg(add.x, add.y).x} y2={toSvg(add.x, add.y).y} color="#10b981" />
            <text x={toSvg(add.x, add.y).x + 5} y={toSvg(add.x, add.y).y - 5} fontSize={9} fill="#10b981">u⃗+v⃗</text>

            {/* Projection (orange) */}
            <line x1={svgCx} y1={svgCy} x2={toSvg(projVec.x, projVec.y).x} y2={toSvg(projVec.x, projVec.y).y} stroke="#f59e0b" strokeWidth={2.5} />
            <circle cx={toSvg(projVec.x, projVec.y).x} cy={toSvg(projVec.x, projVec.y).y} r={3} fill="#f59e0b" />

            {/* Dashed line from u tip to projection (right angle indicator) */}
            <line x1={toSvg(ux, uy).x} y1={toSvg(ux, uy).y} x2={toSvg(projVec.x, projVec.y).x} y2={toSvg(projVec.x, projVec.y).y} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="2 2" />
          </svg>
          <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#6366f1]" /> u⃗</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ec4899]" /> v⃗</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" /> u⃗+v⃗</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" /> proj</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VecInput({ label, dim, values, onChange, color }: {
  label: string; dim: 2 | 3; values: number[]; onChange: (i: number, v: string) => void; color: string;
}) {
  const labels = ["x", "y", "z"];
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-on-surface-variant text-sm">(</span>
        {Array.from({ length: dim }).map((_, i) => (
          <span key={i} className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              value={values[i] ?? 0}
              onChange={(e) => onChange(i, e.target.value)}
              className="w-16 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1.5 text-center text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
            />
            {i < dim - 1 && <span className="text-on-surface-variant">,</span>}
          </span>
        ))}
        <span className="text-on-surface-variant text-sm">)</span>
      </div>
    </div>
  );
}

function Arrow({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 7);
  const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 7);
  const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 7);
  const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 7);

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} />
      <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} />
    </g>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-surface-container-low/60 px-3 py-1.5">
      <span className="text-xs font-semibold text-on-surface-variant shrink-0">{label}</span>
      <span className="font-mono text-sm text-on-surface text-end">{value}</span>
    </div>
  );
}
