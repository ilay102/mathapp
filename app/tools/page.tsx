"use client";

import { useState } from "react";
import { loadLang, type Lang } from "@/lib/i18n";
import MatrixCalc from "@/components/MatrixCalc";
import ComplexCalc from "@/components/ComplexCalc";
import UnitConverter from "@/components/UnitConverter";
import VectorCalc from "@/components/VectorCalc";

type ToolId = "matrix" | "complex" | "units" | "vectors" | null;

const tools = [
  {
    id: "matrix" as ToolId,
    icon: "grid_view",
    title: "Matrix Calculator",
    titleHe: "מחשבון מטריצות",
    desc: "Determinant, inverse, eigenvalues, RREF",
    descHe: "דטרמיננטה, הופכית, ערכים עצמיים, דירוג",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "complex" as ToolId,
    icon: "rotate_right",
    title: "Complex Numbers",
    titleHe: "מספרים מרוכבים",
    desc: "Polar ↔ rectangular, nth roots, Argand diagram",
    descHe: "פולרי ↔ קרטזי, שורשים, דיאגרמת ארגאנד",
    color: "from-purple-500 to-pink-600",
  },
  {
    id: "units" as ToolId,
    icon: "straighten",
    title: "Unit Converter",
    titleHe: "ממיר יחידות",
    desc: "Length, mass, force, energy, temperature, electric",
    descHe: "אורך, מסה, כוח, אנרגיה, טמפרטורה, חשמל",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "vectors" as ToolId,
    icon: "north_east",
    title: "Vector Calculator",
    titleHe: "מחשבון וקטורים",
    desc: "Dot product, cross product, magnitude, angle",
    descHe: "מכפלה סקלרית, וקטורית, גודל, זווית",
    color: "from-orange-500 to-red-600",
  },
];

export default function ToolsPage() {
  const [active, setActive] = useState<ToolId>(null);
  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") as Lang || "en") : "en";
  const isRtl = lang === "he";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f8f9fa] text-on-surface p-6 md:p-10">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
            <span className="material-symbols-outlined">construction</span>
          </div>
          <div>
            <h1 className="note-title text-2xl font-bold text-on-surface">
              {isRtl ? "כלים הנדסיים" : "Engineering Tools"}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {isRtl ? "מחשבונים מהירים לפתרון תרגילים" : "Quick calculators for problem solving"}
            </p>
          </div>
        </div>
      </div>

      {/* Tool Cards Grid */}
      {!active && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActive(tool.id)}
              className="group relative rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-start"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} text-white shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-xl">{tool.icon}</span>
              </div>
              <h3 className="note-title text-lg font-bold text-on-surface mb-1">
                {isRtl ? tool.titleHe : tool.title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {isRtl ? tool.descHe : tool.desc}
              </p>
              <span className="absolute top-6 right-6 material-symbols-outlined text-outline/40 group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Tool View */}
      {active && (
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setActive(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>{isRtl ? "חזרה לכלים" : "Back to Tools"}</span>
          </button>

          {active === "matrix" && <MatrixCalc lang={lang} />}
          {active === "complex" && <ComplexCalc lang={lang} />}
          {active === "units" && <UnitConverter lang={lang} />}
          {active === "vectors" && <VectorCalc lang={lang} />}
        </div>
      )}
    </div>
  );
}
