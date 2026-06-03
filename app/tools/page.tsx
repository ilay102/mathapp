"use client";

import { useState } from "react";
import MatrixCalc from "@/components/MatrixCalc";
import ComplexCalc from "@/components/ComplexCalc";
import UnitConverter from "@/components/UnitConverter";
import VectorCalc from "@/components/VectorCalc";

type LocalToolId = "matrix" | "complex" | "units" | "vectors" | null;

const tools = [
  {
    id: "matrix" as LocalToolId,
    icon: "grid_view",
    title: "Matrix Calculator",
    titleHe: "מחשבון מטריצות",
    desc: "Determinant, inverse, eigenvalues, RREF steps",
    descHe: "דטרמיננטה, הופכית, ערכים עצמיים, וצעדי דירוג",
    color: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/10 hover:shadow-blue-500/20",
    borderHover: "hover:border-blue-500/40",
  },
  {
    id: "complex" as LocalToolId,
    icon: "rotate_right",
    title: "Complex Numbers",
    titleHe: "מספרים מרוכבים",
    desc: "Polar ↔ rectangular, nth roots, Argand plane",
    descHe: "פולרי ↔ קרטזי, שורשים, ודיאגרמת ארגאנד",
    color: "from-purple-500 to-pink-600",
    shadow: "shadow-purple-500/10 hover:shadow-purple-500/20",
    borderHover: "hover:border-purple-500/40",
  },
  {
    id: "units" as LocalToolId,
    icon: "straighten",
    title: "Unit Converter",
    titleHe: "ממיר יחידות",
    desc: "Length, force, energy, power, pressure, electric",
    descHe: "אורך, כוח, אנרגיה, הספק, לחץ, וחשמל",
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
    borderHover: "hover:border-emerald-500/40",
  },
  {
    id: "vectors" as LocalToolId,
    icon: "north_east",
    title: "Vector Calculator",
    titleHe: "מחשבון וקטורים",
    desc: "Dot/cross products, magnitudes, unit vectors, projections",
    descHe: "מכפלה סקלרית, וקטורית, גודל, זווית והטלות",
    color: "from-orange-500 to-red-600",
    shadow: "shadow-orange-500/10 hover:shadow-orange-500/20",
    borderHover: "hover:border-orange-500/40",
  },
];

export default function ToolsPage() {
  const [active, setActive] = useState<LocalToolId>(null);
  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") as any || "en") : "en";
  const isRtl = lang === "he";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f8f9fa] text-on-surface p-6 md:p-10 transition-all duration-300">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">construction</span>
          </div>
          <div>
            <h1 className="note-title text-3xl font-bold text-on-surface tracking-tight">
              {isRtl ? "כלים הנדסיים" : "Engineering Workbench"}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium">
              {isRtl ? "מחשבונים ואמצעי הדמיה מהירים לפתרון תרגילים וניתוח נתונים" : "High-fidelity calculators and coordinate visualizers for academic study"}
            </p>
          </div>
        </div>
      </div>

      {/* Tool Cards Grid */}
      {!active && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActive(tool.id)}
              className={`group relative rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-7 shadow-sm transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] text-start flex flex-col justify-between min-h-[180px] ${tool.shadow} ${tool.borderHover}`}
            >
              <div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.color} text-white shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="material-symbols-outlined text-2xl">{tool.icon}</span>
                </div>
                <h3 className="note-title text-xl font-bold text-on-surface mb-2">
                  {isRtl ? tool.titleHe : tool.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {isRtl ? tool.descHe : tool.desc}
                </p>
              </div>
              <span className={`absolute top-7 ${isRtl ? "left-7" : "right-7"} material-symbols-outlined text-outline/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300`}>
                {isRtl ? "arrow_back" : "arrow_forward"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Tool View */}
      {active && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <button
            onClick={() => setActive(null)}
            className="inline-flex items-center gap-2 rounded-full bg-surface-container hover:bg-surface-container-high px-5 py-2.5 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all duration-200 mb-8 border border-outline-variant/30 hover:shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {isRtl ? "arrow_forward" : "arrow_back"}
            </span>
            <span>{isRtl ? "חזרה לכלים" : "Back to Workbench"}</span>
          </button>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:p-8 shadow-sm">
            {active === "matrix" && <MatrixCalc lang={lang} />}
            {active === "complex" && <ComplexCalc lang={lang} />}
            {active === "units" && <UnitConverter lang={lang} />}
            {active === "vectors" && <VectorCalc lang={lang} />}
          </div>
        </div>
      )}
    </div>
  );
}
