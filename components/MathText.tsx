"use client";

import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import { useMemo } from "react";

/**
 * Renders mixed prose + LaTeX. Detects $$...$$ (block) and $...$ (inline).
 * Falls back to plain text on parse failure so a bad LaTeX string never crashes the UI.
 */
export default function MathText({ children, className = "" }: { children: string; className?: string }) {
  const parts = useMemo(() => split(children), [children]);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        try {
          return p.type === "block"
            ? <BlockMath key={i} math={p.value} />
            : <InlineMath key={i} math={p.value} />;
        } catch {
          return <code key={i} className="rounded bg-neutral-100 px-1">{p.value}</code>;
        }
      })}
    </span>
  );
}

type Part = { type: "text" | "inline" | "block"; value: string };

function split(src: string): Part[] {
  const out: Part[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let last = 0;
  for (let m; (m = re.exec(src)); ) {
    if (m.index > last) out.push({ type: "text", value: src.slice(last, m.index) });
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    const type: Part["type"] = m[1] || m[4] ? "block" : "inline";
    out.push({ type, value });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: "text", value: src.slice(last) });
  return out;
}
