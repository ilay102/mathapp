"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { getStroke } from "perfect-freehand";
import { newStrokeId, type Point, type Stroke, strokeBBox, groupStrokesIntoLines } from "@/lib/strokes";

export type MathCanvasHandle = {
  getStrokes: () => Stroke[];
  setStrokes: (xs: Stroke[]) => void;
  clear: () => void;
  undo: () => void;
  exportPNG: () => string;
  /** Returns one PNG dataURL per detected line of handwriting (white background, padded). */
  exportLinePNGs: () => string[];
};

type Props = {
  height?: number;
  color?: string;
  size?: number;
  className?: string;
  initialStrokes?: Stroke[];
  onChange?: (strokes: Stroke[]) => void;
  mode?: "draw" | "erase";
};

const MathCanvas = forwardRef<MathCanvasHandle, Props>(function MathCanvas(
  { height = 500, color = "#111", size = 3, className = "", initialStrokes, onChange, mode = "draw" },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes ?? []);
  const drawing = useRef<Stroke | null>(null);
  const isErasing = useRef(false);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    if (initialStrokes) {
      setStrokes((prev) => {
        if (prev === initialStrokes) return prev;
        if (
          prev.length === initialStrokes.length &&
          (prev.length === 0 || prev[prev.length - 1].id === initialStrokes[initialStrokes.length - 1].id)
        ) {
          return prev;
        }
        return initialStrokes;
      });
    }
  }, [initialStrokes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    const all = drawing.current ? [...strokes, drawing.current] : strokes;
    for (const s of all) {
      const outline = getStroke(
        s.points.map((p) => [p.x, p.y, p.pressure]),
        { size: s.size, thinning: 0.6, smoothing: 0.5, streamline: 0.5 },
      );
      if (outline.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1]);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    }
    ctx.restore();
  }, [strokes, dpr]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw, dpr]);

  useEffect(() => { draw(); }, [draw]);

  const localPoint = (e: PointerEvent | React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: (e as PointerEvent).pressure || 0.5,
      t: performance.now(),
    };
  };

  const eraseAt = (e: PointerEvent | React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nextStrokes = strokes.filter((s) => {
      const bbox = strokeBBox(s);
      const pad = 15;
      if (x >= bbox.minX - pad && x <= bbox.maxX + pad && y >= bbox.minY - pad && y <= bbox.maxY + pad) {
        return !s.points.some((p) => {
          const dx = p.x - x;
          const dy = p.y - y;
          return dx * dx + dy * dy < 25 * 25; // 25px threshold
        });
      }
      return true;
    });

    if (nextStrokes.length !== strokes.length) {
      setStrokes(nextStrokes);
      onChange?.(nextStrokes);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch" && lastPenAt.current && performance.now() - lastPenAt.current < 1500) return;
    if (e.pointerType === "pen") lastPenAt.current = performance.now();
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }

    if (mode === "erase") {
      isErasing.current = true;
      eraseAt(e);
      return;
    }

    drawing.current = {
      id: newStrokeId(),
      points: [localPoint(e)],
      color,
      size,
    };
    draw();
  };

  const lastPenAt = useRef<number | null>(null);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === "erase") {
      if (isErasing.current) {
        eraseAt(e);
      }
      return;
    }
    if (!drawing.current) return;
    const native = e.nativeEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [native];
    for (const ev of events) {
      drawing.current.points.push(localPoint(ev as PointerEvent));
    }
    draw();
  };

  const onPointerUp = () => {
    if (mode === "erase") {
      isErasing.current = false;
      return;
    }
    if (!drawing.current) return;
    const finished = drawing.current;
    drawing.current = null;
    const nextStrokes = [...strokes, finished];
    setStrokes(nextStrokes);
    onChange?.(nextStrokes);
  };

  useImperativeHandle(ref, () => ({
    getStrokes: () => strokes,
    setStrokes: (xs: Stroke[]) => {
      setStrokes(xs);
      onChange?.(xs);
    },
    clear: () => {
      setStrokes([]);
      onChange?.([]);
    },
    undo: () => {
      setStrokes((xs) => {
        const next = xs.slice(0, -1);
        onChange?.(next);
        return next;
      });
    },
    exportPNG: () => canvasRef.current?.toDataURL("image/png") ?? "",
    exportLinePNGs: () => {
      if (strokes.length === 0) return [];
      const lines = groupStrokesIntoLines(strokes, 50);
      const out: string[] = [];
      for (const lineStrokes of lines) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of lineStrokes) {
          const bb = strokeBBox(s);
          if (bb.minX < minX) minX = bb.minX;
          if (bb.minY < minY) minY = bb.minY;
          if (bb.maxX > maxX) maxX = bb.maxX;
          if (bb.maxY > maxY) maxY = bb.maxY;
        }
        const pad = 24;
        const w = Math.max(64, Math.ceil(maxX - minX + pad * 2));
        const h = Math.max(48, Math.ceil(maxY - minY + pad * 2));
        const lineCanvas = document.createElement("canvas");
        const scale = 2;
        lineCanvas.width = w * scale;
        lineCanvas.height = h * scale;
        const lctx = lineCanvas.getContext("2d");
        if (!lctx) continue;
        lctx.fillStyle = "#ffffff";
        lctx.fillRect(0, 0, lineCanvas.width, lineCanvas.height);
        lctx.scale(scale, scale);
        for (const s of lineStrokes) {
          const outline = getStroke(
            s.points.map((p) => [p.x - minX + pad, p.y - minY + pad, p.pressure]),
            { size: Math.max(s.size, 6), thinning: 0.3, smoothing: 0.5, streamline: 0.5 },
          );
          if (outline.length < 2) continue;
          lctx.beginPath();
          lctx.moveTo(outline[0][0], outline[0][1]);
          for (let i = 1; i < outline.length; i++) lctx.lineTo(outline[i][0], outline[i][1]);
          lctx.closePath();
          lctx.fillStyle = "#000000";
          lctx.fill();
        }
        out.push(lineCanvas.toDataURL("image/png"));
      }
      return out;
    },
  }), [strokes]);

  return (
    <div ref={wrapRef} style={{ height }} className={`w-full rounded-lg border bg-white ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          cursor: mode === "erase"
            ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="%23374151" stroke-width="1.5" fill="white" fill-opacity="0.75"/></svg>') 12 12, auto`
            : "crosshair",
        }}
      />
    </div>
  );
});

export default MathCanvas;
