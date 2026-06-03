"use client";

import { useEffect, useRef, useState } from "react";
import { alternativesFor, convert, format, parseQuantity, type Quantity } from "@/lib/units";

type Props = {
  /** Numeric value (in the unit being displayed, not in SI base). */
  value: number;
  unit: string;
  /** Called when the user picks a different unit from the dropdown. */
  onConvert?: (next: { value: number; unit: string }) => void;
  /** Visual size. */
  size?: "sm" | "md";
};

/**
 * A clickable unit "pill" — magnitude + unit in two halves, like Notion's @-mention.
 * Click to open a dropdown of equivalent units (same dimension); pick one, value is
 * auto-converted.
 *
 * Example: `<UnitTag value={100} unit="km/h" />` shows: [100] [km/h ▾]
 *   click km/h → dropdown lists: m/s · km/h · mph · ft/s
 *   pick m/s → calls onConvert({ value: 27.78, unit: "m/s" })
 */
export default function UnitTag({ value, unit: initialUnit, onConvert, size = "md" }: Props) {
  const [open, setOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState(initialUnit);
  const [currentValue, setCurrentValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUnit(initialUnit);
    setCurrentValue(value);
  }, [initialUnit, value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Same-family alternatives (length → m, cm, mm, in, ft, ...)
  const alts = alternativesFor(currentUnit);
  const fmtValue = formatNum(currentValue);

  const sm = size === "sm";
  const valuePadding = sm ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm";

  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") || "en") : "en";
  const isRtl = lang === "he";

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center align-baseline rounded-md border border-tertiary/40 bg-tertiary-fixed/40 text-tertiary font-mono ${
        isRtl ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <span className={`${valuePadding} text-on-surface ${isRtl ? "rounded-r-md" : "rounded-l-md"}`}>
        {fmtValue}
      </span>
      <button
        onClick={() => alts.length > 1 && setOpen((v) => !v)}
        className={`${valuePadding} hover:bg-tertiary-fixed/60 transition-colors flex items-center gap-0.5 ${
          isRtl
            ? "border-r border-tertiary/40 rounded-l-md"
            : "border-l border-tertiary/40 rounded-r-md"
        }`}
        title={alts.length > 1 ? "Click to convert" : "No alternatives"}
      >
        {currentUnit}
        {alts.length > 1 && <span className="material-symbols-outlined text-[10px]">expand_more</span>}
      </button>

      {open && (
        <div className={`absolute top-full mt-1 z-30 w-44 rounded-lg border border-outline-variant/60 bg-surface-container-lowest shadow-lg p-1 text-xs ${
          isRtl ? "right-0" : "left-0"
        }`}>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-outline">Convert to</div>
          <ul className="max-h-56 overflow-y-auto">
            {alts.map((u) => {
              const isCurrent = u.symbol === currentUnit;
              let converted: number;
              try { converted = convert(currentValue, currentUnit, u.symbol); }
              catch { converted = NaN; }
              return (
                <li key={u.symbol}>
                  <button
                    onClick={() => {
                      if (isCurrent) return;
                      const nextVal = Number(converted.toPrecision(6));
                      setCurrentValue(nextVal);
                      setCurrentUnit(u.symbol);
                      onConvert?.({ value: nextVal, unit: u.symbol });
                      setOpen(false);
                    }}
                    className={
                      "w-full flex items-center justify-between rounded-md px-2 py-1 text-left transition-colors " +
                      (isCurrent ? "bg-primary-fixed text-primary font-medium" : "hover:bg-surface-container")
                    }
                  >
                    <span className="font-mono">{u.symbol}</span>
                    <span className="text-outline text-[11px]">{formatNum(converted)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </span>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e6 || abs < 1e-3) return n.toExponential(2);
  return Number(n.toPrecision(5)).toString();
}

/**
 * Auto-detect "<number> <unit>" patterns in a string and replace them with <UnitTag>.
 * Used to render the editable line as quantity-aware text.
 */
export function annotateWithUnitTags(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*([A-Za-zμΩ°][A-Za-zμΩ°·*/^\d\-²³⁻¹]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const q = parseQuantity(`${m[1]} ${m[2]}`);
    if (q) {
      out.push(<UnitTag key={key++} value={parseFloat(m[1])} unit={m[2]} />);
    } else {
      out.push(<span key={key++}>{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return out;
}
