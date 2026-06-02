"use client";

import { useState } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { loadLang, type Lang } from "@/lib/i18n";

type Formula = {
  name: string;
  nameHe: string;
  math: string;
  latex: string; // what gets copied/inserted
};

type Category = {
  title: string;
  titleHe: string;
  formulas: Formula[];
};

const FORMULAS: Category[] = [
  {
    title: "Calculus - Derivatives",
    titleHe: "נגזרות",
    formulas: [
      { name: "Power Rule", nameHe: "כלל החזקה", math: "\\frac{d}{dx}[x^n] = n x^{n-1}", latex: "n x^{n-1}" },
      { name: "Product Rule", nameHe: "כלל המכפלה", math: "(fg)' = f'g + fg'", latex: "f'g + fg'" },
      { name: "Quotient Rule", nameHe: "כלל המנה", math: "\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}", latex: "\\frac{f'g - fg'}{g^2}" },
      { name: "Chain Rule", nameHe: "כלל השרשרת", math: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) g'(x)", latex: "f'(g(x)) \\cdot g'(x)" },
      { name: "Exponential", nameHe: "אקספוננט", math: "\\frac{d}{dx}[e^x] = e^x", latex: "e^x" },
      { name: "Natural Logarithm", nameHe: "לוגריתם טבעי", math: "\\frac{d}{dx}[\\ln x] = \\frac{1}{x}", latex: "\\frac{1}{x}" },
      { name: "Sine", nameHe: "סינוס", math: "\\frac{d}{dx}[\\sin x] = \\cos x", latex: "\\cos(x)" },
      { name: "Cosine", nameHe: "קוסינוס", math: "\\frac{d}{dx}[\\cos x] = -\\sin x", latex: "-\\sin(x)" },
    ],
  },
  {
    title: "Calculus - Integrals",
    titleHe: "אינטגרלים",
    formulas: [
      { name: "Power Rule", nameHe: "אינטגרל חזקה", math: "\\ref{x^n} = \\frac{x^{n+1}}{n+1} + C", latex: "\\frac{x^{n+1}}{n+1} + C" },
      { name: "Reciprocal", nameHe: "אינטגרל של 1/x", math: "\\int \\frac{1}{x} dx = \\ln|x| + C", latex: "\\ln|x| + C" },
      { name: "Exponential", nameHe: "אינטגרל של אקספוננט", math: "\\int e^x dx = e^x + C", latex: "e^x + C" },
      { name: "Integration by Parts", nameHe: "אינטגרציה בחלקים", math: "\\int u dv = uv - \\int v du", latex: "uv - \\int v du" },
      { name: "Sine", nameHe: "אינטגרל סינוס", math: "\\int \\sin x dx = -\\cos x + C", latex: "-\\cos(x) + C" },
      { name: "Cosine", nameHe: "אינטגרל קוסינוס", math: "\\int \\cos x dx = \\sin x + C", latex: "\\sin(x) + C" },
    ],
  },
  {
    title: "Linear Algebra",
    titleHe: "אלגברה ליניארית",
    formulas: [
      { name: "2x2 Determinant", nameHe: "דטרמיננטה 2x2", math: "\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc", latex: "ad - bc" },
      { name: "Eigenvalue Equation", nameHe: "משוואת ערך עצמי", math: "Av = \\lambda v", latex: "Av = \\lambda v" },
      { name: "Characteristic Eq", nameHe: "פולינום אופייני", math: "\\det(A - \\lambda I) = 0", latex: "\\det(A - \\lambda I) = 0" },
      { name: "Rank-Nullity Theorem", nameHe: "משפט המימדים (דרגה/אפסיות)", math: "\\text{rank}(A) + \\text{nullity}(A) = n", latex: "\\text{rank}(A) + \\text{nullity}(A) = n" },
    ],
  },
  {
    title: "Physics - Mechanics",
    titleHe: "פיזיקה - מכניקה",
    formulas: [
      { name: "Newton's Second Law", nameHe: "חוק שני של ניוטון", math: "\\vec{F} = m\\vec{a}", latex: "F = m \\cdot a" },
      { name: "Kinematic eq (velocity)", nameHe: "קינמטיקה (מהירות)", math: "v = v_0 + at", latex: "v_0 + a \\cdot t" },
      { name: "Kinematic eq (position)", nameHe: "קינמטיקה (מיקום)", math: "x = x_0 + v_0 t + \\frac{1}{2}at^2", latex: "x_0 + v_0 \\cdot t + \\frac{1}{2} a \\cdot t^2" },
      { name: "Kinetic Energy", nameHe: "אנרגיה קינטית", math: "KE = \\frac{1}{2}mv^2", latex: "\\frac{1}{2} m \\cdot v^2" },
      { name: "Potential Energy", nameHe: "אנרגיה פוטנציאלית כובדית", math: "PE = mgh", latex: "m \\cdot g \\cdot h" },
      { name: "Work-Energy Theorem", nameHe: "משפט עבודה-אנרגיה", math: "W = \\Delta KE", latex: "W = \\Delta KE" },
      { name: "Spring Frequency", nameHe: "תדירות קפיץ", math: "\\omega = \\sqrt{\\frac{k}{m}}", latex: "\\sqrt{\\frac{k}{m}}" },
    ],
  },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onInsertFormula?: (latex: string) => void;
};

export default function FormulaSheet({ isOpen, onClose, onInsertFormula }: Props) {
  const [search, setSearch] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") as Lang || "en") : "en";
  const isRtl = lang === "he";

  if (!isOpen) return null;

  const handleCopy = (latex: string, indexStr: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedIndex(indexStr);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const filteredCategories = FORMULAS.map((category) => {
    const formulas = category.formulas.filter((f) => {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.nameHe.includes(q) ||
        f.latex.toLowerCase().includes(q)
      );
    });
    return { ...category, formulas };
  }).filter((category) => category.formulas.length > 0);

  return (
    <aside
      dir={isRtl ? "rtl" : "ltr"}
      className={`fixed top-0 bottom-0 z-40 w-96 bg-surface-container-lowest shadow-2xl border-l border-outline-variant/60 flex flex-col transition-all duration-300 ${
        isRtl ? "left-0" : "right-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/50">
        <h2 className="note-title text-lg font-bold text-on-surface">
          {isRtl ? "נוסחאון מהיר" : "Formula Reference"}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2">
          <span className="material-symbols-outlined text-outline text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRtl ? "חפש נוסחה או משפט..." : "Search formulas..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
      </div>

      {/* Formulas List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center text-sm text-on-surface-variant py-8">
            {isRtl ? "לא נמצאו נוסחאות מתאימות" : "No formulas found."}
          </div>
        ) : (
          filteredCategories.map((category, catIdx) => (
            <div key={catIdx} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isRtl ? category.titleHe : category.title}
              </h3>
              <div className="space-y-2">
                {category.formulas.map((formula, fIdx) => {
                  const keyStr = `${catIdx}-${fIdx}`;
                  return (
                    <div
                      key={fIdx}
                      className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 p-3 hover:bg-surface-container-low transition-all space-y-2 group relative"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-on-surface leading-tight">
                          {isRtl ? formula.nameHe : formula.name}
                        </span>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onInsertFormula && (
                            <button
                              onClick={() => onInsertFormula(formula.latex)}
                              title={isRtl ? "הוסף לטקסט" : "Insert into work"}
                              className="rounded bg-primary-container text-on-primary-container p-1 hover:scale-105 transition-all text-xs"
                            >
                              <span className="material-symbols-outlined text-sm">keyboard_return</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(formula.latex, keyStr)}
                            title={isRtl ? "העתק נוסחה" : "Copy to clipboard"}
                            className="rounded bg-secondary-container text-on-secondary-container p-1 hover:scale-105 transition-all text-xs"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedIndex === keyStr ? "done" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="ruled-paper bg-[#fffefc] rounded border border-outline-variant/20 p-2 flex items-center justify-center overflow-x-auto select-all cursor-pointer min-h-[50px] shadow-sm">
                        <InlineMath math={formula.math} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
