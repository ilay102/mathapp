"use client";

import { useEffect, useRef, useState } from "react";
import { compileExpr3D } from "@/lib/plot";

type Props = {
  expr: string;
  width?: number;
  height?: number;
};

export default function Graph3D({ expr, width = 560, height = 340 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"solid" | "wireframe" | "contour">("solid");

  // Interaction angles
  const [yaw, setYaw] = useState<number>(-Math.PI / 4);
  const [pitch, setPitch] = useState<number>(Math.PI / 6);
  const [zoom, setZoom] = useState<number>(1.2);

  // Drag interaction
  const dragStart = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  // Compile equation
  const fn = compileExpr3D(expr);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fn) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Grid size
    const n = 35;
    const xMin = -3, xMax = 3;
    const yMin = -3, yMax = 3;

    // 1. Generate 3D grid vertices and compute z-coords
    const vertices: { x: number; y: number; z: number; rz: number }[][] = [];
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i <= n; i++) {
      const row: { x: number; y: number; z: number; rz: number }[] = [];
      const px = xMin + ((xMax - xMin) * i) / n;
      for (let j = 0; j <= n; j++) {
        const py = yMin + ((yMax - yMin) * j) / n;
        let pz = 0;
        try {
          const val = fn(px, py);
          pz = Number.isFinite(val) ? val : 0;
        } catch {
          pz = 0;
        }
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
        // Keep raw z to scale colors
        row.push({ x: px, y: py, z: pz, rz: pz });
      }
      vertices.push(row);
    }

    if (minZ === maxZ) {
      minZ -= 1;
      maxZ += 1;
    }

    // 2. Projection settings
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const viewScale = 60 * zoom;

    // Project point (x, y, z) -> (screenX, screenY, depth)
    const project = (x: number, y: number, z: number) => {
      // Scale coordinates to fit view
      const sx = x * 1.2;
      const sy = y * 1.2;
      const sz = ((z - minZ) / (maxZ - minZ) - 0.5) * 2.5; // normalize z to [-1.25, 1.25]

      // Rotate around Y-axis (yaw)
      const x1 = sx * cosY - sy * sinY;
      const y1 = sx * sinY + sy * cosY;

      // Rotate around X-axis (pitch)
      const y2 = y1 * cosP - sz * sinP;
      const z2 = y1 * sinP + sz * cosP;

      return {
        x: width / 2 + x1 * viewScale,
        y: height / 2 - y2 * viewScale,
        depth: z2,
      };
    };

    // 3. Build polygons (quads)
    type Quad = {
      p0: { x: number; y: number; depth: number };
      p1: { x: number; y: number; depth: number };
      p2: { x: number; y: number; depth: number };
      p3: { x: number; y: number; depth: number };
      avgDepth: number;
      avgZ: number; // raw average z height
      normal: { x: number; y: number; z: number };
    };

    const quads: Quad[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v0 = vertices[i][j];
        const v1 = vertices[i + 1][j];
        const v2 = vertices[i + 1][j + 1];
        const v3 = vertices[i][j + 1];

        const p0 = project(v0.x, v0.y, v0.z);
        const p1 = project(v1.x, v1.y, v1.z);
        const p2 = project(v2.x, v2.y, v2.z);
        const p3 = project(v3.x, v3.y, v3.z);

        const avgDepth = (p0.depth + p1.depth + p2.depth + p3.depth) / 4;
        const avgZ = (v0.z + v1.z + v2.z + v3.z) / 4;

        // Compute normal vector for lighting
        // ux, uy, uz
        const ux = v1.x - v0.x;
        const uy = v1.y - v0.y;
        const uz = v1.z - v0.z;
        // vx, vy, vz
        const vx = v3.x - v0.x;
        const vy = v3.y - v0.y;
        const vz = v3.z - v0.z;

        // cross product
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        quads.push({
          p0, p1, p2, p3,
          avgDepth,
          avgZ,
          normal: { x: nx / len, y: ny / len, z: nz / len },
        });
      }
    }

    // 4. Sort quads back-to-front (Painter's algorithm)
    quads.sort((a, b) => b.avgDepth - a.avgDepth);

    // 5. Draw
    quads.forEach((q) => {
      // Calculate color based on height z
      const pct = (q.avgZ - minZ) / (maxZ - minZ);
      // Hue: 240 (blue) to 0 (red/magenta)
      const hue = Math.max(0, Math.min(240, 240 - pct * 240));

      if (mode === "solid") {
        // Lighting: Light source coming from top-right-front [0.5, 0.5, 1]
        const lx = 0.5, ly = 0.5, lz = 1;
        const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
        const dot = (q.normal.x * lx + q.normal.y * ly + q.normal.z * lz) / lLen;
        const diff = Math.max(0.3, Math.min(1.0, (dot + 1) / 2)); // ambient + diffuse mix

        ctx.fillStyle = `hsl(${hue}, 85%, ${Math.round(45 * diff)}%)`;
        ctx.strokeStyle = `hsl(${hue}, 80%, ${Math.round(35 * diff)}%)`;
        ctx.lineWidth = 0.4;

        ctx.beginPath();
        ctx.moveTo(q.p0.x, q.p0.y);
        ctx.lineTo(q.p1.x, q.p1.y);
        ctx.lineTo(q.p2.x, q.p2.y);
        ctx.lineTo(q.p3.x, q.p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (mode === "wireframe") {
        ctx.strokeStyle = `hsl(${hue}, 85%, 50%)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(q.p0.x, q.p0.y);
        ctx.lineTo(q.p1.x, q.p1.y);
        ctx.lineTo(q.p2.x, q.p2.y);
        ctx.lineTo(q.p3.x, q.p3.y);
        ctx.closePath();
        ctx.stroke();
      } else if (mode === "contour") {
        // Flat heatmap colored by average height
        ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(q.p0.x, q.p0.y);
        ctx.lineTo(q.p1.x, q.p1.y);
        ctx.lineTo(q.p2.x, q.p2.y);
        ctx.lineTo(q.p3.x, q.p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

  }, [fn, mode, yaw, pitch, zoom, width, height]);

  // Drag handlers for rotating the graph
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY, yaw, pitch };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setYaw(dragStart.current.yaw + dx * 0.007);
    setPitch(Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, dragStart.current.pitch + dy * 0.007)));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStart.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.4, Math.min(3.0, z * factor)));
  };

  if (!fn) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/40 p-4 text-center text-xs text-on-surface-variant">
        Can't graph this 3D expression: {expr}
      </div>
    );
  }

  return (
    <figure className="relative rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2 select-none">
      {/* 3D Mode Selector overlay */}
      <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-full bg-white/90 p-0.5 text-xs shadow-sm border border-outline-variant/30 backdrop-blur">
        {(["solid", "wireframe", "contour"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
              mode === m ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {m === "solid" ? "Solid" : m === "wireframe" ? "Wire" : "Contour"}
          </button>
        ))}
      </div>

      {/* Reset button overlay */}
      <button
        onClick={() => {
          setYaw(-Math.PI / 4);
          setPitch(Math.PI / 6);
          setZoom(1.2);
        }}
        type="button"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant/60 bg-white/95 text-on-surface-variant shadow-sm backdrop-blur hover:bg-surface-container active:scale-95 transition-all"
        title="Reset view"
      >
        <span className="material-symbols-outlined text-base">restart_alt</span>
      </button>

      {/* Render Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        className="w-full cursor-grab active:cursor-grabbing rounded-lg touch-none"
      />

      <figcaption className="mt-1 flex items-center justify-between text-[11px] text-on-surface-variant/80 px-2 font-mono">
        <span>f(x, y) = {expr}</span>
        <span>drag to rotate · scroll to zoom</span>
      </figcaption>
    </figure>
  );
}
