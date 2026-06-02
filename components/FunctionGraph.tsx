"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compileExpr, compileExpr3D, sampleFn, clampYRange, findFeatures, definiteIntegral, type Sample, type Annotation } from "@/lib/plot";
import { loadLang, type Lang, t } from "@/lib/i18n";

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
  onViewChange?: (view: [number, number]) => void;
  chartType?: "1d" | "slopefield" | "vectorfield" | "parametric" | "polar";
};

export default function FunctionGraph({
  expr, curves, range = [-5, 5], width = 560, height = 220,
  integralRange, annotate = true, onViewChange, chartType = "1d",
}: Props) {
  // Normalize input → list of curves
  const initialCurves: Curve[] = useMemo(() => {
    if (curves && curves.length) return curves;
    if (expr) return [{ expr, color: "#003fd2" }];
    return [];
  }, [expr, curves]);

  // Interactive state: pan + zoom maintain a "view" range that can differ from the initial.
  const [view, setView] = useState<[number, number]>(range);
  const [lang, setLang] = useState<Lang>("en");

  // Riemann sum state
  const [riemannActive, setRiemannActive] = useState(false);
  const [riemannType, setRiemannType] = useState<"left" | "right" | "mid" | "trap">("left");
  const [riemannN, setRiemannN] = useState<number>(10);

  // ODE Solutions state
  const [odeSolutions, setOdeSolutions] = useState<{ x: number; y: number }[][]>([]);

  const updateView = (newView: [number, number]) => {
    setView(newView);
    onViewChange?.(newView);
  };

  useEffect(() => {
    setLang(loadLang());
  }, []);

  useEffect(() => {
    setView(range);
    onViewChange?.(range);
  }, [range[0], range[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compile every curve once
  const compiled = useMemo(() => initialCurves.map((c) => ({
    ...c,
    fn: compileExpr(c.expr),
  })), [initialCurves]);

  // Compile 3D expression for vector field/slope field
  const compiled3D = useMemo(() => {
    if ((chartType === "slopefield" || chartType === "vectorfield") && expr) {
      return compileExpr3D(expr);
    }
    return null;
  }, [expr, chartType]);

  const compiledVector = useMemo(() => {
    if (chartType === "vectorfield" && expr) {
      const parts = expr.split(",");
      const fnP = compileExpr3D(parts[0] ?? "0");
      const fnQ = compileExpr3D(parts[1] ?? "0");
      return { fnP, fnQ };
    }
    return null;
  }, [expr, chartType]);

  const compiledParametric = useMemo(() => {
    if (chartType === "parametric" && expr) {
      const parts = expr.split(",");
      const fnX = compileExpr(parts[0] ?? "0");
      const fnY = compileExpr(parts[1] ?? "0");
      return { fnX, fnY };
    }
    return null;
  }, [expr, chartType]);

  const compiledPolar = useMemo(() => {
    if (chartType === "polar" && expr) {
      return compileExpr(expr);
    }
    return null;
  }, [expr, chartType]);

  // We can calculate the initial y-span by sampling at the default range:
  const initialYSpan = useMemo(() => {
    const series = compiled.map((c) => ({
      ...c,
      samples: c.fn ? sampleFn(c.fn, range[0], range[1]) : ([] as Sample[]),
    }));
    const allSamples = series.flatMap((s) => s.samples);
    const [yMin, yMax] = clampYRange(allSamples);
    return Math.abs(yMax - yMin) || 2;
  }, [compiled, range]);

  // Sample all curves over current view, derive a shared y-range
  const computed = useMemo(() => {
    const [x0, x1] = view;
    let series: { expr: string; color?: string; label?: string; style?: "solid" | "dashed"; samples: Sample[] }[] = [];
    
    if (chartType === "polar" && compiledPolar) {
      const steps = 240;
      const samples: Sample[] = [];
      for (let i = 0; i <= steps; i++) {
        const theta = (i * 2 * Math.PI) / steps;
        try {
          const r = compiledPolar(theta);
          if (Number.isFinite(r)) {
            samples.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
          }
        } catch {}
      }
      series = [{ expr: expr || "", color: "#003fd2", samples }];
    } else if (chartType === "parametric" && compiledParametric?.fnX && compiledParametric?.fnY) {
      const steps = 240;
      const samples: Sample[] = [];
      const usesTrig = expr?.includes("sin") || expr?.includes("cos");
      const tMin = usesTrig ? 0 : -10;
      const tMax = usesTrig ? 2 * Math.PI : 10;
      for (let i = 0; i <= steps; i++) {
        const t = tMin + ((tMax - tMin) * i) / steps;
        try {
          const rx = compiledParametric.fnX(t);
          const ry = compiledParametric.fnY(t);
          if (Number.isFinite(rx) && Number.isFinite(ry)) {
            samples.push({ x: rx, y: ry });
          }
        } catch {}
      }
      series = [{ expr: expr || "", color: "#003fd2", samples }];
    } else {
      series = compiled.map((c) => ({
        ...c,
        samples: c.fn ? sampleFn(c.fn, x0, x1) : ([] as Sample[]),
      }));
    }

    const allSamples = series.flatMap((s) => s.samples);
    let [yMin, yMax] = clampYRange(allSamples);

    // Clamp vertical span
    const currentYSpan = yMax - yMin;
    const minYSpan = 0.5;
    const maxYSpan = 4 * initialYSpan;
    if (currentYSpan < minYSpan) {
      const mid = (yMin + yMax) / 2;
      yMin = mid - minYSpan / 2;
      yMax = mid + minYSpan / 2;
    } else if (currentYSpan > maxYSpan) {
      const mid = (yMin + yMax) / 2;
      yMin = mid - maxYSpan / 2;
      yMax = mid + maxYSpan / 2;
    }

    // Annotations are derived from the FIRST (primary) curve only — that's the canonical answer.
    const primary = series[0];
    let annotations: Annotation[] = [];
    const initialSpan = range[1] - range[0];
    const currentSpan = x1 - x0;
    
    if (chartType === "1d" && annotate && primary?.samples && compiled[0]?.fn && currentSpan <= 2 * initialSpan) {
      const rawAnnotations = findFeatures(primary.samples, compiled[0].fn);
      
      // Limit to 5 zeros, 3 max, 3 min. Sort by proximity to origin.
      let zeros = rawAnnotations.filter((a) => a.kind === "zero");
      let maxs = rawAnnotations.filter((a) => a.kind === "max");
      let mins = rawAnnotations.filter((a) => a.kind === "min");
      
      zeros = zeros.sort((a, b) => Math.abs(a.x) - Math.abs(b.x)).slice(0, 5);
      maxs = maxs.sort((a, b) => Math.abs(a.x) - Math.abs(b.x)).slice(0, 3);
      mins = mins.sort((a, b) => Math.abs(a.x) - Math.abs(b.x)).slice(0, 3);
      
      annotations = [...zeros, ...maxs, ...mins];
    }

    // Definite integral value over the supplied [a, b]
    const integralValue = chartType === "1d" && integralRange && compiled[0]?.fn
      ? definiteIntegral(compiled[0].fn, integralRange[0], integralRange[1])
      : null;
    return { series, yMin, yMax, annotations, integralValue };
  }, [compiled, view, annotate, integralRange, initialYSpan, range, chartType, compiledPolar, compiledParametric, expr]);

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

  // Multitouch state
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const lastDistance = useRef<number | null>(null);

  function clientToViewBox(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = width / rect.width;
    const sy = height / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  // Drag tracking
  const dragRef = useRef<{ startCx: number; startView: [number, number] } | null>(null);

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;
    activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (activePointers.current.size === 1) {
      dragRef.current = { startCx: pt.x, startView: view };
    } else if (activePointers.current.size === 2) {
      dragRef.current = null; // Disable pan drag
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].clientX - pts[1].clientX;
      const dy = pts[0].clientY - pts[1].clientY;
      lastDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onUp(e?: React.PointerEvent<SVGSVGElement>) {
    if (e) {
      activePointers.current.delete(e.pointerId);
      try {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      } catch (err) {
        // ignore if already released or invalid
      }
    } else {
      activePointers.current.clear();
    }
    
    if (activePointers.current.size < 2) {
      lastDistance.current = null;
    }
    if (activePointers.current.size === 0) {
      dragRef.current = null;
    }
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;

    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    if (activePointers.current.size === 1 && dragRef.current) {
      const dx = pt.x - dragRef.current.startCx;
      const span = x1 - x0;
      const shift = (-dx / innerW) * span;
      const newRange: [number, number] = [
        dragRef.current.startView[0] + shift,
        dragRef.current.startView[1] + shift,
      ];
      updateView(newRange);
      setHover({ cx: pt.x, x: invX(pt.x) });
    } else if (activePointers.current.size === 2 && lastDistance.current !== null) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].clientX - pts[1].clientX;
      const dy = pts[0].clientY - pts[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const factor = lastDistance.current / dist;
        lastDistance.current = dist;

        const midClientX = (pts[0].clientX + pts[1].clientX) / 2;
        const midClientY = (pts[0].clientY + pts[1].clientY) / 2;
        const midPt = clientToViewBox(midClientX, midClientY);
        if (midPt) {
          const cursorX = invX(midPt.x);
          const span = x1 - x0;
          const initialSpan = range[1] - range[0];
          const newSpan = Math.max(0.5, Math.min(4 * initialSpan, span * (factor > 1 ? 1.05 : 0.95)));
          
          const ratio = (cursorX - x0) / span;
          const newX0 = cursorX - ratio * newSpan;
          const newX1 = newX0 + newSpan;
          updateView([newX0, newX1]);
        }
      }
    } else {
      if (pt.x < padL || pt.x > padL + innerW) { setHover(null); return; }
      setHover({ cx: pt.x, x: invX(pt.x) });
    }
  }

  // Scroll-to-zoom (centered on cursor)
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const pt = clientToViewBox(e.clientX, e.clientY);
    if (!pt) return;
    const cursorX = invX(pt.x);
    const span = x1 - x0;
    const factor = e.deltaY < 0 ? 0.8 : 1.25;
    const initialSpan = range[1] - range[0];
    const newSpan = Math.max(0.5, Math.min(4 * initialSpan, span * factor));
    // Keep cursor anchored
    const ratio = (cursorX - x0) / span;
    const newX0 = cursorX - ratio * newSpan;
    const newX1 = newX0 + newSpan;
    updateView([newX0, newX1]);
  }

  const solveRK4 = (fn: (x: number, y: number) => number, startX: number, startY: number, xMin: number, xMax: number, steps = 120) => {
    const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
    
    // Integrate forward
    let cx = startX;
    let cy = startY;
    let dx = (xMax - startX) / steps;
    for (let i = 0; i < steps; i++) {
      if (!Number.isFinite(cy) || Math.abs(cy) > 100) break;
      const k1 = fn(cx, cy);
      const k2 = fn(cx + dx / 2, cy + (dx / 2) * k1);
      const k3 = fn(cx + dx / 2, cy + (dx / 2) * k2);
      const k4 = fn(cx + dx, cy + dx * k3);
      cy = cy + (dx / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      cx = cx + dx;
      points.push({ x: cx, y: cy });
    }
    
    // Integrate backward
    cx = startX;
    cy = startY;
    dx = (xMin - startX) / steps;
    const bwdPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < steps; i++) {
      if (!Number.isFinite(cy) || Math.abs(cy) > 100) break;
      const k1 = fn(cx, cy);
      const k2 = fn(cx + dx / 2, cy + (dx / 2) * k1);
      const k3 = fn(cx + dx / 2, cy + (dx / 2) * k2);
      const k4 = fn(cx + dx, cy + dx * k3);
      cy = cy + (dx / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      cx = cx + dx;
      bwdPoints.push({ x: cx, y: cy });
    }
    
    return [...bwdPoints.reverse(), ...points];
  };

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartType !== "slopefield" || !compiled3D) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = width / rect.width;
    const sy = height / rect.height;
    const clickCx = (e.clientX - rect.left) * sx;
    const clickCy = (e.clientY - rect.top) * sy;
    
    const clickX = invX(clickCx);
    const clickY = yMin + ((padT + innerH - clickCy) / innerH) * (yMax - yMin);
    
    const newSol = solveRK4(compiled3D, clickX, clickY, x0, x1);
    setOdeSolutions((prev) => [...prev, newSol]);
  };

  function reset() {
    updateView(range);
    setOdeSolutions([]);
  }

  // Generate Slope Field grid lines
  const slopeFieldLines = useMemo(() => {
    if (chartType !== "slopefield" || !compiled3D) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const stepsX = 20;
    const stepsY = 15;
    
    for (let i = 0; i < stepsX; i++) {
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / stepsX;
      for (let j = 0; j < stepsY; j++) {
        const cy = yMin + ((yMax - yMin) * (j + 0.5)) / stepsY;
        try {
          const m = compiled3D(cx, cy);
          if (Number.isFinite(m)) {
            const length = 7;
            const theta = Math.atan(m);
            const dx = length * Math.cos(theta);
            const dy = length * Math.sin(theta);
            
            const px0 = px(cx);
            const py0 = py(cy);
            
            lines.push({
              x1: px0 - dx,
              y1: py0 + dy,
              x2: px0 + dx,
              y2: py0 - dy,
            });
          }
        } catch {}
      }
    }
    return lines;
  }, [chartType, compiled3D, x0, x1, yMin, yMax]);

  // Generate Vector Field grid arrows
  const vectorFieldArrows = useMemo(() => {
    if (chartType !== "vectorfield" || !compiledVector?.fnP || !compiledVector?.fnQ) return [];
    const arrows: { points: string }[] = [];
    const stepsX = 18;
    const stepsY = 13;
    
    for (let i = 0; i < stepsX; i++) {
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / stepsX;
      for (let j = 0; j < stepsY; j++) {
        const cy = yMin + ((yMax - yMin) * (j + 0.5)) / stepsY;
        try {
          const vx = compiledVector.fnP(cx, cy);
          const vy = compiledVector.fnQ(cx, cy);
          if (Number.isFinite(vx) && Number.isFinite(vy)) {
            const px0 = px(cx);
            const py0 = py(cy);
            
            const mag = Math.sqrt(vx * vx + vy * vy);
            if (mag === 0) continue;
            
            const scale = Math.min(16, mag * 2) / mag;
            const dx = vx * scale;
            const dy = vy * scale;
            
            const px1 = px0 + dx;
            const py1 = py0 - dy;
            
            const angle = Math.atan2(-dy, dx);
            const arrowSize = 4;
            const hx1 = px1 - arrowSize * Math.cos(angle - Math.PI / 6);
            const hy1 = py1 - arrowSize * Math.sin(angle - Math.PI / 6);
            const hx2 = px1 - arrowSize * Math.cos(angle + Math.PI / 6);
            const hy2 = py1 - arrowSize * Math.sin(angle + Math.PI / 6);
            
            arrows.push({
              points: `${px0},${py0} ${px1},${py1} ${hx1},${hy1} ${px1},${py1} ${hx2},${hy2}`,
            });
          }
        } catch {}
      }
    }
    return arrows;
  }, [chartType, compiledVector, x0, x1, yMin, yMax]);

  // Riemann Sum calculator
  const riemannData = useMemo(() => {
    if (!riemannActive || !integralRange || !compiled[0]?.fn) return null;
    const [a, b] = integralRange;
    const fn = compiled[0].fn!;
    const n = riemannN;
    const dx = (b - a) / n;
    
    let approx = 0;
    const polygons: { points: string; fill: string; stroke: string }[] = [];
    
    for (let i = 0; i < n; i++) {
      const xLeft = a + i * dx;
      const xRight = a + (i + 1) * dx;
      let xEval = xLeft;
      let yEval = 0;
      
      if (riemannType === "left") {
        xEval = xLeft;
        yEval = fn(xEval);
        approx += yEval * dx;
        polygons.push({
          points: `${px(xLeft)},${py(0)} ${px(xLeft)},${py(yEval)} ${px(xRight)},${py(yEval)} ${px(xRight)},${py(0)}`,
          fill: "rgba(16, 185, 129, 0.12)",
          stroke: "rgba(16, 185, 129, 0.45)",
        });
      } else if (riemannType === "right") {
        xEval = xRight;
        yEval = fn(xEval);
        approx += yEval * dx;
        polygons.push({
          points: `${px(xLeft)},${py(0)} ${px(xLeft)},${py(yEval)} ${px(xRight)},${py(yEval)} ${px(xRight)},${py(0)}`,
          fill: "rgba(16, 185, 129, 0.12)",
          stroke: "rgba(16, 185, 129, 0.45)",
        });
      } else if (riemannType === "mid") {
        xEval = xLeft + dx / 2;
        yEval = fn(xEval);
        approx += yEval * dx;
        polygons.push({
          points: `${px(xLeft)},${py(0)} ${px(xLeft)},${py(yEval)} ${px(xRight)},${py(yEval)} ${px(xRight)},${py(0)}`,
          fill: "rgba(16, 185, 129, 0.12)",
          stroke: "rgba(16, 185, 129, 0.45)",
        });
      } else if (riemannType === "trap") {
        const yL = fn(xLeft);
        const yR = fn(xRight);
        approx += 0.5 * (yL + yR) * dx;
        polygons.push({
          points: `${px(xLeft)},${py(0)} ${px(xLeft)},${py(yL)} ${px(xRight)},${py(yR)} ${px(xRight)},${py(0)}`,
          fill: "rgba(16, 185, 129, 0.12)",
          stroke: "rgba(16, 185, 129, 0.45)",
        });
      }
    }
    
    const exact = computed.integralValue ?? 0;
    const error = Math.abs(approx - exact);
    const errorPct = exact !== 0 ? (error / Math.abs(exact)) * 100 : 0;
    
    return { approx, exact, error, errorPct, polygons };
  }, [riemannActive, riemannType, riemannN, integralRange, compiled, computed.integralValue]);

  const hasGraphable = 
    (compiled.length > 0 && compiled.some((c) => c.fn)) || 
    (chartType === "slopefield" && compiled3D) ||
    (chartType === "vectorfield" && compiledVector?.fnP && compiledVector?.fnQ) ||
    (chartType === "parametric" && compiledParametric?.fnX && compiledParametric?.fnY) ||
    (chartType === "polar" && compiledPolar);

  if (!hasGraphable) {
    return (
      <div className="rounded border border-dashed border-outline-variant/60 bg-surface-container-low/40 p-3 text-xs text-on-surface-variant">
        Can't graph the supplied expression{expr ? `: ${expr}` : ""}.
      </div>
    );
  }

  // Tick generation
  const xTicks = niceTicks(x0, x1, 6);
  const yTicks = niceTicks(yMin, yMax, 4);

  // Hover y-values per curve
  const hoverYs = hover ? computed.series.map((_s, i) => {
    const fn = compiled[i]?.fn;
    if (!fn) return null;
    try { const y = fn(hover.x); return Number.isFinite(y) ? y : null; } catch { return null; }
  }) : null;

  return (
    <figure className="relative rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-2 select-none">
      <button
        onClick={reset}
        type="button"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant/60 bg-white/95 text-on-surface-variant shadow-sm backdrop-blur hover:bg-surface-container active:scale-95 transition-all"
        title="Reset view"
      >
        <span className="material-symbols-outlined text-base">restart_alt</span>
      </button>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair touch-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={(e) => onUp(e)}
        onPointerLeave={(e) => { setHover(null); onUp(e); }}
        onWheel={onWheel}
        onDoubleClick={reset}
        onClick={onSvgClick}
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

        {/* Riemann sum rectangles */}
        {riemannActive && riemannData && riemannData.polygons.map((p, idx) => (
          <polygon key={"rs"+idx} points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={1} />
        ))}

        {/* integral area (shaded under the primary curve) */}
        {!riemannActive && integralRange && computed.series[0]?.samples && (() => {
          const [a, b] = integralRange;
          const fn = compiled[0]?.fn;
          if (!fn) return null;
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

        {/* Slope field tangent segments */}
        {chartType === "slopefield" && slopeFieldLines.map((l, idx) => (
          <line key={"sf"+idx} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#747687" strokeOpacity={0.6} strokeWidth={1.2} />
        ))}

        {/* Vector field arrows */}
        {chartType === "vectorfield" && vectorFieldArrows.map((a, idx) => (
          <polyline key={"vf"+idx} points={a.points} stroke="#00567d" strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
        ))}

        {/* RK4 solution curves from clicks */}
        {chartType === "slopefield" && odeSolutions.map((sol, idx) => {
          const path = buildPath(sol.map((p) => ({ x: p.x, y: p.y })), px, py);
          return path ? (
            <path key={"sol"+idx} d={path} stroke="#ec4899" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
          ) : null;
        })}

        {/* curves */}
        {chartType !== "slopefield" && chartType !== "vectorfield" && computed.series.map((s, i) => {
          const path = buildPath(s.samples, px, py);
          const color = s.color ?? "#003fd2";
          const dash = s.style === "dashed" ? "6 4" : undefined;
          return path ? (
            <path key={i} d={path} stroke={color} strokeWidth={2} fill="none"
              strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} />
          ) : null;
        })}

        {/* annotations (zeros, max, min) on the primary curve */}
        {(() => {
          type BBox = { x0: number; x1: number; y0: number; y1: number };
          const drawnLabels: BBox[] = [];
          
          const overlaps = (b1: BBox, b2: BBox, padding = 4): boolean => {
            return !(
              b1.x1 + padding < b2.x0 ||
              b2.x1 + padding < b1.x0 ||
              b1.y1 + padding < b2.y0 ||
              b2.y1 + padding < b1.y0
            );
          };

          return computed.annotations.map((a, i) => {
            if (a.x < x0 || a.x > x1 || a.y < yMin || a.y > yMax) return null;
            const fill = a.kind === "zero" ? "#ffffff" : a.kind === "max" ? "#10b981" : "#dc2626";
            const stroke = a.kind === "zero" ? "#003fd2" : "#1f2937";
            const label = a.kind === "zero" ? "○" : a.kind === "max" ? "▲" : "▼";
            
            const cx = px(a.x);
            const cy = py(a.y);
            const labelText = `${label} (${fmt(a.x)}, ${fmt(a.y)})`;
            const approxWidth = labelText.length * 6;
            
            const bbox: BBox = {
              x0: cx - approxWidth / 2,
              x1: cx + approxWidth / 2,
              y0: cy - 18,
              y1: cy - 4,
            };
            
            const collides = drawnLabels.some((box) => overlaps(box, bbox));
            const showLabel = !collides;
            if (showLabel) {
              drawnLabels.push(bbox);
            }

            return (
              <g key={"ann"+i}>
                <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke={stroke} strokeWidth={1.5} />
                {showLabel && (
                  <text x={cx} y={cy - 8} fontSize={11} textAnchor="middle" fill={stroke} className="select-none font-mono">
                    {labelText}
                  </text>
                )}
              </g>
            );
          });
        })()}

        {/* hover crosshair */}
        {hover && chartType !== "vectorfield" && (
          <>
            <line x1={hover.cx} y1={padT} x2={hover.cx} y2={padT + innerH}
              stroke="#003fd2" strokeOpacity={0.5} strokeDasharray="3 3" strokeWidth={1} />
            {hoverYs?.map((y, i) =>
              y === null ? null : (
                <circle key={"hc"+i} cx={hover.cx} cy={py(y)} r={3.5}
                  fill={computed.series[i]?.color ?? "#003fd2"} stroke="white" strokeWidth={1.2} />
              )
            )}
          </>
        )}
      </svg>

      {/* Hover readout (top-right inside the figure) */}
      {hover && hoverYs && chartType !== "vectorfield" && (
        <div className="pointer-events-none absolute right-12 top-3 rounded-md border border-outline-variant/60 bg-white/90 px-2 py-1 text-[11px] font-mono shadow-sm backdrop-blur">
          x = {fmt(hover.x)}
          {hoverYs.map((y, i) => y === null ? null : (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: computed.series[i]?.color ?? "#003fd2" }} />
              <span>{computed.series[i]?.label ?? "y"} = {fmt(y)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Riemann Sum Controls row */}
      {integralRange && chartType === "1d" && (
        <div className="mt-2 rounded-lg border border-outline-variant/30 bg-surface-container-low/40 p-2 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 font-semibold text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={riemannActive}
                onChange={(e) => setRiemannActive(e.target.checked)}
                className="accent-primary"
              />
              <span>{lang === "he" ? "הצג סכומי רימן (קירוב אינטגרל)" : "Show Riemann Sum approximation"}</span>
            </label>
          </div>

          {riemannActive && riemannData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-outline-variant/20">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-outline">
                  <span>{lang === "he" ? "סוג סכום:" : "Sum type:"}</span>
                  <select
                    value={riemannType}
                    onChange={(e) => setRiemannType(e.target.value as any)}
                    className="rounded border border-outline-variant/60 bg-white px-1 py-0.5 text-on-surface focus:outline-none"
                  >
                    <option value="left">{lang === "he" ? "שמאלי" : "Left sum"}</option>
                    <option value="right">{lang === "he" ? "ימני" : "Right sum"}</option>
                    <option value="mid">{lang === "he" ? "אמצעי" : "Midpoint"}</option>
                    <option value="trap">{lang === "he" ? "טרפזים" : "Trapezoid"}</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-outline">
                  <span>{lang === "he" ? "מספר מלבנים (n):" : "Subdivisions (n):"} {riemannN}</span>
                  <input
                    type="range"
                    min="2"
                    max="100"
                    value={riemannN}
                    onChange={(e) => setRiemannN(Number(e.target.value))}
                    className="w-24 accent-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center rounded bg-white/70 p-2 font-mono text-[11px] border border-outline-variant/20">
                <div className="flex justify-between">
                  <span>Approx:</span>
                  <span className="font-semibold text-primary">{fmt(riemannData.approx)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exact:</span>
                  <span className="text-on-surface-variant">{fmt(riemannData.exact)}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/20 mt-1 pt-1 text-[10px]">
                  <span>Error:</span>
                  <span className="font-semibold text-error">
                    {fmt(riemannData.error)} ({riemannData.errorPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend + reset + integral readout */}
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-3">
          {chartType === "1d" && computed.series.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className={"inline-block h-0.5 w-4 " + (s.style === "dashed" ? "border-t-2 border-dashed" : "")}
                    style={{ background: s.style === "dashed" ? "transparent" : (s.color ?? "#003fd2"),
                             borderColor: s.color ?? "#003fd2" }} />
              <code className="font-mono text-[11px]">{s.label ?? s.expr}</code>
            </span>
          ))}
          {chartType === "slopefield" && (
            <span className="text-[10px] text-outline font-semibold">
              {lang === "he" ? "שדה שיפועים · לחץ על הגרף לציור מסלול פתרון" : "Slope Field · Click graph to trace a solution"}
            </span>
          )}
          {chartType === "vectorfield" && (
            <span className="text-[10px] text-outline font-semibold">
              {lang === "he" ? "שדה וקטורי" : "Vector Field"}
            </span>
          )}
          {chartType === "parametric" && (
            <span className="text-[10px] text-outline font-semibold">
              {lang === "he" ? "עקומה פרמטרית" : "Parametric Curve"}
            </span>
          )}
          {chartType === "polar" && (
            <span className="text-[10px] text-outline font-semibold">
              {lang === "he" ? "עקומה פולרית" : "Polar Curve"}
            </span>
          )}

          {computed.integralValue !== null && integralRange && !riemannActive && (
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
          <span>{chartType === "slopefield" ? (lang === "he" ? "לחץ לציור מסלול פתרון" : "click to plot solutions") : "drag to pan · scroll to zoom"}</span>
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
