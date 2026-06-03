"use client";

import { useState, useContext } from "react";
import { loadLang, type Lang } from "@/lib/i18n";
import { MathInputContext } from "@/lib/mathInputContext";

type Props = {
  onSelectSymbol?: (symbol: string) => void;
};

type SymbolItem = {
  label: string;      // math/KaTeX preview symbol
  latex: string;      // raw LaTeX to insert
  tooltip: string;    // explanation
};

export default function MathPalette({ onSelectSymbol }: Props) {
  const [activeTab, setActiveTab] = useState<"calc" | "linalg" | "general" | "greek" | "constants" | "units">("calc");
  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") as Lang || "en") : "en";
  const isRtl = lang === "he";

  const categories = {
    calc: {
      title: isRtl ? "אנליזה וחדו\"א" : "Calculus",
      items: [
        { label: "df/dx", latex: "\\frac{d}{dx} ", tooltip: isRtl ? "נגזרת" : "Derivative" },
        { label: "∂f/∂x", latex: "\\frac{\\partial }{\\partial x} ", tooltip: isRtl ? "נגזרת חלקית" : "Partial derivative" },
        { label: "∫", latex: "\\int ", tooltip: isRtl ? "אינטגרל לא מסוים" : "Indefinite integral" },
        { label: "∫_a^b", latex: "\\int_{a}^{b} ", tooltip: isRtl ? "אינטגרל מסוים" : "Definite integral" },
        { label: "lim", latex: "\\lim_{x \\to 0} ", tooltip: isRtl ? "גבול" : "Limit" },
        { label: "∑", latex: "\\sum_{i=1}^{n} ", tooltip: isRtl ? "סכום" : "Summation" },
        { label: "∇", latex: "\\nabla ", tooltip: isRtl ? "גרדיאנט" : "Gradient" },
        { label: "dx", latex: "dx", tooltip: "Differential dx" },
        { label: "dy", latex: "dy", tooltip: "Differential dy" },
      ],
    },
    linalg: {
      title: isRtl ? "אלגברה ליניארית" : "Linear Algebra",
      items: [
        { label: "[a b; c d]", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", tooltip: isRtl ? "מטריצה 2x2" : "2x2 Matrix" },
        { label: "det(A)", latex: "\\det(A)", tooltip: isRtl ? "דטרמיננטה" : "Determinant" },
        { label: "A^-1", latex: "A^{-1}", tooltip: isRtl ? "מטריצה הופכית" : "Inverse matrix" },
        { label: "λ", latex: "\\lambda ", tooltip: isRtl ? "ערך עצמי" : "Eigenvalue" },
        { label: "v⃗", latex: "\\vec{v}", tooltip: isRtl ? "וקטור" : "Vector" },
        { label: "I", latex: "I", tooltip: isRtl ? "מטריצת היחידה" : "Identity matrix" },
        { label: "dim", latex: "\\dim(V)", tooltip: isRtl ? "מימד" : "Dimension" },
        { label: "ker", latex: "\\ker(A)", tooltip: isRtl ? "גרעין" : "Kernel" },
        { label: "Im", latex: "\\text{Im}(A)", tooltip: isRtl ? "תמונה" : "Image" },
      ],
    },
    general: {
      title: isRtl ? "כללי" : "General Math",
      items: [
        { label: "π", latex: "\\pi ", tooltip: "Pi" },
        { label: "e", latex: "e", tooltip: "Euler's constant" },
        { label: "∞", latex: "\\infty ", tooltip: isRtl ? "אינסוף" : "Infinity" },
        { label: "√x", latex: "\\sqrt{x} ", tooltip: isRtl ? "שורש ריבועי" : "Square root" },
        { label: "x^n", latex: "x^{n}", tooltip: isRtl ? "חזקה" : "Power" },
        { label: "x_n", latex: "x_{n}", tooltip: isRtl ? "אינדקס" : "Subscript" },
        { label: "±", latex: "\\pm ", tooltip: isRtl ? "פלוס-מינוס" : "Plus-minus" },
        { label: "≈", latex: "\\approx ", tooltip: isRtl ? "בערך שווה" : "Approximately equal" },
        { label: "≠", latex: "\\neq ", tooltip: isRtl ? "לא שווה" : "Not equal" },
      ],
    },
    greek: {
      title: isRtl ? "אותיות יווניות" : "Greek letters",
      items: [
        { label: "α", latex: "\\alpha ", tooltip: "Alpha" },
        { label: "β", latex: "\\beta ", tooltip: "Beta" },
        { label: "γ", latex: "\\gamma ", tooltip: "Gamma" },
        { label: "θ", latex: "\\theta ", tooltip: "Theta" },
        { label: "μ", latex: "\\mu ", tooltip: "Mu" },
        { label: "ω", latex: "\\omega ", tooltip: "Omega" },
        { label: "Δ", latex: "\\Delta ", tooltip: "Delta" },
        { label: "σ", latex: "\\sigma ", tooltip: "Sigma" },
        { label: "τ", latex: "\\tau ", tooltip: "Tau" },
      ],
    },
    constants: {
      title: isRtl ? "קבועים פיזיקליים" : "Constants",
      items: [
        { label: "π", latex: "\\pi ", tooltip: "Pi (3.1415)" },
        { label: "e", latex: "e", tooltip: "Euler's constant (2.718)" },
        { label: "φ", latex: "\\phi ", tooltip: "Golden ratio (1.618)" },
        { label: "c", latex: "2.998e8 m/s", tooltip: "Speed of light (2.998e8 m/s)" },
        { label: "g", latex: "9.81 m/s^2", tooltip: "Standard gravity (9.81 m/s²)" },
        { label: "G", latex: "6.674e-11 N*m^2/kg^2", tooltip: "Gravitational constant" },
        { label: "h", latex: "6.626e-34 J*s", tooltip: "Planck constant" },
        { label: "ℏ", latex: "1.055e-34 J*s", tooltip: "Reduced Planck constant" },
        { label: "k_B", latex: "1.381e-23 J/K", tooltip: "Boltzmann constant" },
        { label: "N_A", latex: "6.022e23 /mol", tooltip: "Avogadro number" },
        { label: "R", latex: "8.314 J/(mol*K)", tooltip: "Gas constant" },
        { label: "ε_0", latex: "8.854e-12 F/m", tooltip: "Vacuum permittivity" },
        { label: "μ_0", latex: "1.257e-6 N/A^2", tooltip: "Vacuum permeability" },
        { label: "m_e", latex: "9.109e-31 kg", tooltip: "Electron rest mass" },
        { label: "m_p", latex: "1.673e-27 kg", tooltip: "Proton rest mass" },
        { label: "q_e", latex: "1.602e-19 C", tooltip: "Elementary charge" },
      ],
    },
    units: {
      title: isRtl ? "יחידות פיזיקליות" : "Units",
      items: [
        { label: "m", latex: " m", tooltip: isRtl ? "מטר" : "meter (length)" },
        { label: "kg", latex: " kg", tooltip: isRtl ? "קילוגרם" : "kilogram (mass)" },
        { label: "s", latex: " s", tooltip: isRtl ? "שנייה" : "second (time)" },
        { label: "A", latex: " A", tooltip: isRtl ? "אמפר" : "ampere (current)" },
        { label: "K", latex: " K", tooltip: isRtl ? "קלווין" : "kelvin (temp)" },
        { label: "N", latex: " N", tooltip: isRtl ? "ניוטון" : "newton (force)" },
        { label: "J", latex: " J", tooltip: isRtl ? "ג'אול" : "joule (energy)" },
        { label: "W", latex: " W", tooltip: isRtl ? "וואט" : "watt (power)" },
        { label: "Pa", latex: " Pa", tooltip: isRtl ? "פסקל" : "pascal (pressure)" },
        { label: "V", latex: " V", tooltip: isRtl ? "וולט" : "volt (voltage)" },
        { label: "Ω", latex: " Ω", tooltip: isRtl ? "אום" : "ohm (resistance)" },
        { label: "ft", latex: " ft", tooltip: isRtl ? "רגל" : "foot" },
        { label: "lb", latex: " lb", tooltip: isRtl ? "ליברה" : "pound" },
        { label: "°F", latex: " °F", tooltip: isRtl ? "פרנהייט" : "fahrenheit" },
        { label: "psi", latex: " psi", tooltip: isRtl ? "PSI" : "psi" },
        { label: "hp", latex: " hp", tooltip: isRtl ? "כוח סוס" : "horsepower" },
        { label: "kΩ", latex: " kΩ", tooltip: isRtl ? "קילואום" : "kilohm" },
        { label: "μF", latex: " μF", tooltip: isRtl ? "מיקרופארד" : "microfarad" },
        { label: "mA", latex: " mA", tooltip: isRtl ? "מיליאמפר" : "milliampere" },
        { label: "mV", latex: " mV", tooltip: isRtl ? "מיליוולט" : "millivolt" },
        { label: "ns", latex: " ns", tooltip: isRtl ? "נאנו-שנייה" : "nanosecond" },
        { label: "μs", latex: " μs", tooltip: isRtl ? "מיקרו-שנייה" : "microsecond" },
      ],
    },
  };

  const contextInsert = useContext(MathInputContext);

  const handleSelect = (latex: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(latex);
    } else if (contextInsert) {
      contextInsert(latex);
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-2">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 pb-1.5 mb-2 gap-1 overflow-x-auto text-[11px] font-medium">
        {(Object.keys(categories) as Array<keyof typeof categories>).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-full px-2.5 py-1 transition-colors whitespace-nowrap ${
              activeTab === key ? "bg-primary text-on-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {categories[key].title}
          </button>
        ))}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-9">
        {categories[activeTab].items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelect(item.latex)}
            title={item.tooltip}
            className="flex h-9 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-sm font-medium hover:border-primary hover:text-primary transition-all font-mono hover:scale-105 active:scale-95 shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
