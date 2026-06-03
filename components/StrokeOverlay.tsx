"use client";

import { useMemo } from "react";
import type { Stroke } from "@/lib/strokes";
import { strokeBBox, groupStrokesIntoLines } from "@/lib/strokes";

export type LineVerdict = "wrong" | "incomplete" | "correct";

type Props = {
  strokes: Stroke[];
  /** Indexed by visual-line order matching groupStrokesIntoLines. Missing = no verdict. */
  verdicts: Map<number, LineVerdict>;
  onBadgeClick?: (lineIndex: number) => void;
};

/**
 * Absolute-positioned SVG layer that draws per-line verdicts on top of the canvas:
 *   - "wrong":      red strikethrough across the line
 *   - "incomplete": amber dashed underline
 *   - "correct":    green checkmark at the right edge
 * The badges also serve as click targets to re-open the result drawer.
 */
export default function StrokeOverlay({ strokes, verdicts, onBadgeClick }: Props) {
  const lines = useMemo(() => groupStrokesIntoLines(strokes, 60), [strokes]);

  if (!strokes.length || verdicts.size === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {lines.map((lineStrokes, i) => {
        const verdict = verdicts.get(i);
        if (!verdict) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of lineStrokes) {
          const bb = strokeBBox(s);
          if (bb.minX < minX) minX = bb.minX;
          if (bb.minY < minY) minY = bb.minY;
          if (bb.maxX > maxX) maxX = bb.maxX;
          if (bb.maxY > maxY) maxY = bb.maxY;
        }
        if (!isFinite(minX)) return null;
        const cy = (minY + maxY) / 2;
        const pad = 8;

        if (verdict === "wrong") {
          return (
            <g key={i}>
              <line
                x1={minX - pad}
                y1={cy}
                x2={maxX + pad}
                y2={cy}
                stroke="#dc2626"
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={0.85}
              />
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => onBadgeClick?.(i)}
                transform={`translate(${maxX + pad + 12}, ${cy - 12})`}
              >
                <circle r={11} cx={11} cy={11} fill="#dc2626" />
                <text x={11} y={16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
                  ✗
                </text>
              </g>
            </g>
          );
        }

        if (verdict === "incomplete") {
          return (
            <g key={i}>
              <line
                x1={minX - pad}
                y1={maxY + 6}
                x2={maxX + pad}
                y2={maxY + 6}
                stroke="#d97706"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="6 4"
                opacity={0.9}
              />
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => onBadgeClick?.(i)}
                transform={`translate(${maxX + pad + 12}, ${cy - 12})`}
              >
                <circle r={11} cx={11} cy={11} fill="#d97706" />
                <text x={11} y={16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
                  !
                </text>
              </g>
            </g>
          );
        }

        // correct
        return (
          <g key={i}>
            <g
              className="pointer-events-auto cursor-pointer"
              onClick={() => onBadgeClick?.(i)}
              transform={`translate(${maxX + pad + 4}, ${cy - 12})`}
            >
              <circle r={11} cx={11} cy={11} fill="#059669" />
              <path
                d="M 6 11 L 10 15 L 16 8"
                stroke="white"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
