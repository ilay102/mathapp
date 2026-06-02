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
  const [activeTab, setActiveTab] = useState<"calc" | "linalg" | "general" | "greek" | "constants">("calc");
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
        { label: "c", latex: "c", tooltip: "Speed of light (2.998e8 m/s)" },
        { label: "G", latex: "G", tooltip: "Gravitational constant (6.674e-11)" },
        { label: "h", latex: "h", tooltip: "Planck constant" },
        { label: "ℏ", latex: "\\hbar ", tooltip: "Reduced Planck constant" },
        { label: "k_B", latex: "k_B", tooltip: "Boltzmann constant" },
        { label: "N_A", latex: "N_A", tooltip: "Avogadro number" },
        { label: "R", latex: "R", tooltip: "Gas constant" },
        { label: "ε_0", latex: "\\epsilon_0", tooltip: "Vacuum permittivity" },
        { label: "μ_0", latex: "\\mu_0", tooltip: "Vacuum permeability" },
        { label: "g", latex: "g", tooltip: "Standard gravity (9.81 m/s²)" },
        { label: "q_e", latex: "q_e", tooltip: "Elementary charge" },
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
