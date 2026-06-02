"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compileExpr, sampleFn, clampYRange, findFeatures, definiteIntegral, type Sample, type Annotation } from "@/lib/plot";

export type Curve = {
  expr: string;
  color?: string;
  label?: string;
  /** "solid" (default) or "dashed". Dashed is used for the student's wrong answer. */
  style?: "solid" | "dashed";
};

type Props = {
  /** Single-curve shorthand. Either pass this OR `curves`. */
  expr?: string;
  /** Multiple curves, drawn in order. */
  curves?: Curve[];
  range?: [number, number];
  width?: number;
  height?: number;
  /** If set, shade the area under the FIRST curve over [a, b] and label the integral value. */
  integralRange?: [number, number];
  /** Toggle automatic annotations (zeros, max, min). Defaults to true. */
  annotate?: boolean;
};

export default function FunctionGraph({
  expr, curves, range = [-5, 5], width = 560, height = 220,
  integralRange, annotate = true,
}: Props) {
  // Normalize input → list of curves
  const initialCurves: Curve[] = useMemo(() => {
    if (curves && curves.length) return curves;
    if (expr) return [{ expr, color: "#003fd2" }];
    return [];
  }, [expr, curves]);

  // Interactive state: pan + zoom maintain a "view" range that can differ from the initial.
  const [view, setView] = useState<[number, number]>(range);
  useEffect(() => { setView(range); }, [range[0], range[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compile every curve once
  const compiled = useMemo(() => initialCurves.map((c) => ({
    ...c,
    fn: compileExpr(c.expr),
  })), [initialCurves]);

  // Sample all curves over current view, derive a shared y-range
  const computed = useMemo(() => {
    const [x0, x1] = view;
    const series = compiled.map((c) => ({
      ...c,
      samples: c.fn ? sampleFn(c.fn, x0, x1) : ([] as Sample[]),
    }));
    const allSamples = series.flatMap((s) => s.samples);
    const [yMin, yMax] = clampYRange(allSamples);
    // Annotations are derived from the FIRST (primary) curve only — that's the canonical answer.
    const primary = series[0];
    const annotations: Annotation[] = (annotate && primary?.fn) ? findFeatures(primary.samples, primary.fn) : [];
    // Definite integral value over the supplied [a, b]
    const integralValue = integralRange && primary?.fn
      ? definiteIntegral(primary.fn, integralRange[0], integralRange[1])
      : null;
    return { series, yMin, yMax, annotations, integralValue };
  }, [compiled, view, annotate, integralRange]);

  // SVG geometry
  const padL = 36, padR = 12, padT = 12, padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const [x0, x1] = view;
  const yMin = computed.yMin, yMax = computed.yMax;
  const px = (x: number) => padL + ((x - x0) / (x1 - x0)) * innerW;
  const py = (y: number) => padT + innerH - ((y - yMin) / (yMax - yMin)) * innerH;
  const invX = (cx: number) => x0 + ((cx - padL) / innerW) * (x1 - x0);

  // Hover crosshair
  const [hover, setHover] = useState<{ cx: number; x: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function clientToViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = width / rect.width;
    const sy = height / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;
    if (pt.x < padL || pt.x > padL + innerW) { setHover(null); return; }
    setHover({ cx: pt.x, x: invX(pt.x) });

    // Drag-to-pan
    if (dragRef.current) {
      const dx = pt.x - dragRef.current.startCx;
      const span = x1 - x0;
      const shift = (-dx / innerW) * span;
      const newRange: [number, number] = [
        dragRef.current.startView[0] + shift,
        dragRef.current.startView[1] + shift,
      ];
      setView(newRange);
    }
  }

  // Drag tracking
  const dragRef = useRef<{ startCx: number; startView: [number, number] } | null>(null);
  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;
    dragRef.current = { startCx: pt.x, startView: view };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onUp() { dragRef.current = null; }

  // Scroll-to-zoom (centered on cursor)
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;
    const cursorX = invX(pt.x);
    const span = x1 - x0;
    const factor = e.deltaY < 0 ? 0.8 : 1.25;
    const newSpan = Math.max(0.1, Math.min(1000, span * factor));
    // Keep cursor anchored
    const ratio = (cursorX - x0) / span;
    const newX0 = cursorX - ratio * newSpan;
    const newX1 = newX0 + newSpan;
    setView([newX0, newX1]);
  }

  function reset() { setView(range); }

  if (compiled.length === 0 || compiled.every((c) => !c.fn)) {
    return (
      <div className="rounded border border-dashed border-outline-variant/60 bg-surface-container-low/40 p-3 text-xs text-on-surface-variant">
        Can't graph the supplied expression{compiled[0]?.expr ? `: ${compiled[0].expr}` : ""}.
      </div>
    );
  }

  // Tick generation
  const xTicks = niceTicks(x0, x1, 6);
  const yTicks = niceTicks(yMin, yMax, 4);

  // Hover y-values per curve
  const hoverYs = hover ? computed.series.map((s) => {
    if (!s.fn) return null;
    try { const y = s.fn(hover.x); return Number.isFinite(y) ? y : null; } catch { return null; }
  }) : null;

  return (
    <figure className="relative rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-2 select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair touch-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={() => { setHover(null); onUp(); }}
        onWheel={onWheel}
        onDoubleClick={reset}
      >
        {/* gridlines */}
        {xTicks.map((t) => (
          <line key={"vx"+t} x1={px(t)} y1={padT} x2={px(t)} y2={padT + innerH} stroke="#eef0f2" strokeWidth={1} />
        ))}
        {yTicks.map((t) => (
          <line key={"hy"+t} x1={padL} y1={py(t)} x2={padL + innerW} y2={py(t)} stroke="#eef0f2" strokeWidth={1} />
        ))}
        {/* axes (only when 0 is in view) */}
        {0 >= x0 && 0 <= x1 && (
          <line x1={px(0)} y1={padT} x2={px(0)} y2={padT + innerH} stroke="#c4c5d8" strokeWidth={1} />
        )}
        {0 >= yMin && 0 <= yMax && (
          <line x1={padL} y1={py(0)} x2={padL + innerW} y2={py(0)} stroke="#c4c5d8" strokeWidth={1} />
        )}
        {/* tick labels */}
        {xTicks.map((t) => (
          <text key={"tx"+t} x={px(t)} y={height - 8} fontSize={10} textAnchor="middle" fill="#747687">{fmt(t)}</text>
        ))}
        {yTicks.map((t) => (
          <text key={"ty"+t} x={padL - 4} y={py(t) + 3} fontSize={10} textAnchor="end" fill="#747687">{fmt(t)}</text>
        ))}

        {/* integral area (shaded under the primary curve) */}
        {integralRange && computed.series[0]?.fn && (() => {
          const [a, b] = integralRange;
          const fn = computed.series[0].fn!;
          const n = 200;
          const lo = Math.max(Math.min(a, b), x0);
          const hi = Math.min(Math.max(a, b), x1);
          if (lo >= hi) return null;
          let area = `M${px(lo).toFixed(1)},${py(0).toFixed(1)}`;
          for (let i = 0; i <= n; i++) {
            const x = lo + ((hi - lo) * i) / n;
            let y: number;
            try { y = fn(x); } catch { y = 0; }
            if (!Number.isFinite(y)) y = 0;
            area += `L${px(x).toFixed(1)},${py(y).toFixed(1)}`;
          }
          area += `L${px(hi).toFixed(1)},${py(0).toFixed(1)}Z`;
          return <path d={area} fill="#00567d" fillOpacity={0.18} stroke="#00567d" strokeOpacity={0.4} strokeWidth={1} />;
        })()}

        {/* curves */}
        {computed.series.map((s, i) => {
          const path = buildPath(s.samples, px, py);
          const color = s.color ?? "#003fd2";
          const dash = s.style === "dashed" ? "6 4" : undefined;
          return path ? (
            <path key={i} d={path} stroke={color} strokeWidth={2} fill="none"
              strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} />
          ) : null;
        })}

        {/* annotations (zeros, max, min) on the primary curve */}
        {computed.annotations.map((a, i) => {
          // Skip if off-screen
          if (a.x < x0 || a.x > x1 || a.y < yMin || a.y > yMax) return null;
          const fill = a.kind === "zero" ? "#ffffff" : a.kind === "max" ? "#10b981" : "#dc2626";
          const stroke = a.kind === "zero" ? "#003fd2" : "#1f2937";
          const label = a.kind === "zero" ? "○" : a.kind === "max" ? "▲" : "▼";
          return (
            <g key={"ann"+i}>
              <circle cx={px(a.x)} cy={py(a.y)} r={4.5} fill={fill} stroke={stroke} strokeWidth={1.5} />
              <text x={px(a.x)} y={py(a.y) - 8} fontSize={11} textAnchor="middle" fill={stroke} className="select-none">
                {label} ({fmt(a.x)}, {fmt(a.y)})
              </text>
            </g>
          );
        })}

        {/* hover crosshair */}
        {hover && (
          <>
            <line x1={hover.cx} y1={padT} x2={hover.cx} y2={padT + innerH}
              stroke="#003fd2" strokeOpacity={0.5} strokeDasharray="3 3" strokeWidth={1} />
            {hoverYs?.map((y, i) =>
              y === null ? null : (
                <circle key={"hc"+i} cx={hover.cx} cy={py(y)} r={3.5}
                  fill={computed.series[i].color ?? "#003fd2"} stroke="white" strokeWidth={1.2} />
              )
            )}
          </>
        )}
      </svg>

      {/* Hover readout (top-right inside the figure) */}
      {hover && hoverYs && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-outline-variant/60 bg-white/90 px-2 py-1 text-[11px] font-mono shadow-sm backdrop-blur">
          x = {fmt(hover.x)}
          {hoverYs.map((y, i) => y === null ? null : (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: computed.series[i].color ?? "#003fd2" }} />
              <span>{computed.series[i].label ?? "y"} = {fmt(y)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend + reset + integral readout */}
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-3">
          {computed.series.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className={"inline-block h-0.5 w-4 " + (s.style === "dashed" ? "border-t-2 border-dashed" : "")}
                    style={{ background: s.style === "dashed" ? "transparent" : (s.color ?? "#003fd2"),
                             borderColor: s.color ?? "#003fd2" }} />
              <code className="font-mono text-[11px]">{s.label ?? s.expr}</code>
            </span>
          ))}
          {computed.integralValue !== null && integralRange && (
            <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed/50 px-2 py-0.5 text-tertiary font-medium">
              ∫<sub>{integralRange[0]}</sub><sup>{integralRange[1]}</sup> ≈ {fmt(computed.integralValue)}
            </span>
          )}
          {computed.annotations.length > 0 && (
            <span className="text-[10px] text-outline">
              · {computed.annotations.filter(a=>a.kind==="zero").length} zero(s),
              {" "}{computed.annotations.filter(a=>a.kind==="max").length} max,
              {" "}{computed.annotations.filter(a=>a.kind==="min").length} min
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-outline">
          <span>drag to pan · scroll to zoom · dbl-click reset</span>
          <button onClick={reset} className="rounded-full border border-outline-variant px-2 py-0.5 hover:bg-surface-container">reset</button>
        </div>
      </figcaption>
    </figure>
  );
}

function buildPath(samples: Sample[], px: (x: number) => number, py: (y: number) => number): string {
  let path = "";
  let move = true;
  for (const s of samples) {
    if (s.y === null) { move = true; continue; }
    path += move ? `M${px(s.x).toFixed(1)},${py(s.y).toFixed(1)}` : `L${px(s.x).toFixed(1)},${py(s.y).toFixed(1)}`;
    move = false;
  }
  return path;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.01)) return n.toExponential(1);
  return Number(n.toFixed(3)).toString();
}

function niceTicks(lo: number, hi: number, target: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return [];
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
