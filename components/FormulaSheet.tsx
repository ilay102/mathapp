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
  icon: string; // Material Symbol icon name
  formulas: Formula[];
};

const FORMULAS: Category[] = [
  /* ──────────── DERIVATIVES ──────────── */
  {
    title: "Derivatives",
    titleHe: "נגזרות",
    icon: "trending_up",
    formulas: [
      { name: "Power Rule", nameHe: "כלל החזקה", math: "\\frac{d}{dx}[x^n] = n x^{n-1}", latex: "n x^{n-1}" },
      { name: "Product Rule", nameHe: "כלל המכפלה", math: "(fg)' = f'g + fg'", latex: "f'g + fg'" },
      { name: "Quotient Rule", nameHe: "כלל המנה", math: "\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}", latex: "\\frac{f'g - fg'}{g^2}" },
      { name: "Chain Rule", nameHe: "כלל השרשרת", math: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) g'(x)", latex: "f'(g(x)) \\cdot g'(x)" },
      { name: "Exponential", nameHe: "אקספוננט", math: "\\frac{d}{dx}[e^x] = e^x", latex: "e^x" },
      { name: "General Exponential", nameHe: "אקספוננט כללי", math: "\\frac{d}{dx}[a^x] = a^x \\ln a", latex: "a^x \\ln a" },
      { name: "Natural Logarithm", nameHe: "לוגריתם טבעי", math: "\\frac{d}{dx}[\\ln x] = \\frac{1}{x}", latex: "\\frac{1}{x}" },
      { name: "General Logarithm", nameHe: "לוגריתם כללי", math: "\\frac{d}{dx}[\\log_a x] = \\frac{1}{x \\ln a}", latex: "\\frac{1}{x \\ln a}" },
      { name: "Sine", nameHe: "סינוס", math: "\\frac{d}{dx}[\\sin x] = \\cos x", latex: "\\cos(x)" },
      { name: "Cosine", nameHe: "קוסינוס", math: "\\frac{d}{dx}[\\cos x] = -\\sin x", latex: "-\\sin(x)" },
      { name: "Tangent", nameHe: "טנגנס", math: "\\frac{d}{dx}[\\tan x] = \\sec^2 x", latex: "\\sec^2(x)" },
      { name: "Inverse Sine", nameHe: "ארקסינוס", math: "\\frac{d}{dx}[\\arcsin x] = \\frac{1}{\\sqrt{1-x^2}}", latex: "\\frac{1}{\\sqrt{1-x^2}}" },
      { name: "Inverse Tangent", nameHe: "ארקטנגנס", math: "\\frac{d}{dx}[\\arctan x] = \\frac{1}{1+x^2}", latex: "\\frac{1}{1+x^2}" },
      { name: "Implicit diff.", nameHe: "גזירה סתומה", math: "\\frac{d}{dx}[y] = \\frac{dy}{dx}", latex: "\\frac{dy}{dx}" },
    ],
  },
  /* ──────────── INTEGRALS ──────────── */
  {
    title: "Integrals",
    titleHe: "אינטגרלים",
    icon: "area_chart",
    formulas: [
      { name: "Power Rule", nameHe: "אינטגרל חזקה", math: "\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C,\\; n \\ne -1", latex: "\\frac{x^{n+1}}{n+1} + C" },
      { name: "Reciprocal", nameHe: "אינטגרל של 1/x", math: "\\int \\frac{1}{x}\\,dx = \\ln|x| + C", latex: "\\ln|x| + C" },
      { name: "Exponential", nameHe: "אקספוננט", math: "\\int e^x\\,dx = e^x + C", latex: "e^x + C" },
      { name: "General Exponential", nameHe: "אקספוננט כללי", math: "\\int a^x\\,dx = \\frac{a^x}{\\ln a} + C", latex: "\\frac{a^x}{\\ln a} + C" },
      { name: "Sine", nameHe: "סינוס", math: "\\int \\sin x\\,dx = -\\cos x + C", latex: "-\\cos(x) + C" },
      { name: "Cosine", nameHe: "קוסינוס", math: "\\int \\cos x\\,dx = \\sin x + C", latex: "\\sin(x) + C" },
      { name: "sec²x", nameHe: "סקנט בריבוע", math: "\\int \\sec^2 x\\,dx = \\tan x + C", latex: "\\tan(x) + C" },
      { name: "1/(1+x²)", nameHe: "ארקטנגנס", math: "\\int \\frac{1}{1+x^2}\\,dx = \\arctan x + C", latex: "\\arctan(x) + C" },
      { name: "1/√(1−x²)", nameHe: "ארקסינוס", math: "\\int \\frac{1}{\\sqrt{1-x^2}}\\,dx = \\arcsin x + C", latex: "\\arcsin(x) + C" },
      { name: "Integration by Parts", nameHe: "אינטגרציה בחלקים", math: "\\int u\\,dv = uv - \\int v\\,du", latex: "uv - \\int v\\,du" },
      { name: "LIATE Rule", nameHe: "כלל LIATE", math: "\\text{Log, Inverse trig, Algebra, Trig, Exp}", latex: "\\text{LIATE}" },
      { name: "u-Substitution", nameHe: "החלפת משתנה", math: "\\int f(g(x))g'(x)\\,dx = \\int f(u)\\,du", latex: "\\int f(u)\\,du" },
    ],
  },
  /* ──────────── TRIG IDENTITIES ──────────── */
  {
    title: "Trig Identities",
    titleHe: "זהויות טריגונומטריות",
    icon: "change_history",
    formulas: [
      { name: "Pythagorean", nameHe: "פיתגורס", math: "\\sin^2\\theta + \\cos^2\\theta = 1", latex: "\\sin^2\\theta + \\cos^2\\theta = 1" },
      { name: "Pythagorean (tan)", nameHe: "פיתגורס (טנ')", math: "1 + \\tan^2\\theta = \\sec^2\\theta", latex: "1 + \\tan^2\\theta = \\sec^2\\theta" },
      { name: "Double Angle (sin)", nameHe: "זווית כפולה (sin)", math: "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta", latex: "2\\sin\\theta\\cos\\theta" },
      { name: "Double Angle (cos)", nameHe: "זווית כפולה (cos)", math: "\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta", latex: "\\cos^2\\theta - \\sin^2\\theta" },
      { name: "cos²θ (power red.)", nameHe: "הורדת חזקה (cos²)", math: "\\cos^2\\theta = \\frac{1+\\cos 2\\theta}{2}", latex: "\\frac{1+\\cos 2\\theta}{2}" },
      { name: "sin²θ (power red.)", nameHe: "הורדת חזקה (sin²)", math: "\\sin^2\\theta = \\frac{1-\\cos 2\\theta}{2}", latex: "\\frac{1-\\cos 2\\theta}{2}" },
      { name: "Sum (sin)", nameHe: "חיבור זוויות (sin)", math: "\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta", latex: "\\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta" },
      { name: "Sum (cos)", nameHe: "חיבור זוויות (cos)", math: "\\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta", latex: "\\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta" },
      { name: "Sum-to-Product (sin)", nameHe: "סכום למכפלה (sin)", math: "\\sin A + \\sin B = 2\\sin\\frac{A+B}{2}\\cos\\frac{A-B}{2}", latex: "2\\sin\\frac{A+B}{2}\\cos\\frac{A-B}{2}" },
      { name: "Product-to-Sum", nameHe: "מכפלה לסכום", math: "\\sin A\\cos B = \\frac{1}{2}[\\sin(A+B)+\\sin(A-B)]", latex: "\\frac{1}{2}[\\sin(A+B)+\\sin(A-B)]" },
      { name: "Half Angle (sin)", nameHe: "חצי זווית (sin)", math: "\\sin\\frac{\\theta}{2} = \\pm\\sqrt{\\frac{1-\\cos\\theta}{2}}", latex: "\\pm\\sqrt{\\frac{1-\\cos\\theta}{2}}" },
      { name: "Half Angle (cos)", nameHe: "חצי זווית (cos)", math: "\\cos\\frac{\\theta}{2} = \\pm\\sqrt{\\frac{1+\\cos\\theta}{2}}", latex: "\\pm\\sqrt{\\frac{1+\\cos\\theta}{2}}" },
    ],
  },
  /* ──────────── LIMITS & SERIES ──────────── */
  {
    title: "Limits & Series",
    titleHe: "גבולות וטורים",
    icon: "all_inclusive",
    formulas: [
      { name: "sin(x)/x", nameHe: "sinx/x", math: "\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1", latex: "\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1" },
      { name: "(1-cos x)/x²", nameHe: "(1-cosx)/x²", math: "\\lim_{x\\to 0}\\frac{1-\\cos x}{x^2} = \\frac{1}{2}", latex: "\\frac{1}{2}" },
      { name: "Euler's limit", nameHe: "גבול אוילר", math: "\\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n = e", latex: "e" },
      { name: "L'Hôpital's Rule", nameHe: "כלל לופיטל", math: "\\frac{0}{0}\\text{ or }\\frac{\\infty}{\\infty}: \\lim\\frac{f}{g}=\\lim\\frac{f'}{g'}", latex: "\\lim\\frac{f'}{g'}" },
      { name: "Geometric Series", nameHe: "טור הנדסי", math: "\\sum_{n=0}^{\\infty}ar^n = \\frac{a}{1-r},\\;|r|<1", latex: "\\frac{a}{1-r}" },
      { name: "p-Series", nameHe: "טור p", math: "\\sum_{n=1}^{\\infty}\\frac{1}{n^p}: \\text{conv. iff } p>1", latex: "p > 1" },
      { name: "Taylor (eˣ)", nameHe: "טיילור (eˣ)", math: "e^x = \\sum_{n=0}^{\\infty}\\frac{x^n}{n!}", latex: "\\sum_{n=0}^{\\infty}\\frac{x^n}{n!}" },
      { name: "Taylor (sin x)", nameHe: "טיילור (sin)", math: "\\sin x = \\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n+1}}{(2n+1)!}", latex: "\\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n+1}}{(2n+1)!}" },
      { name: "Taylor (cos x)", nameHe: "טיילור (cos)", math: "\\cos x = \\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n}}{(2n)!}", latex: "\\sum_{n=0}^{\\infty}\\frac{(-1)^n x^{2n}}{(2n)!}" },
      { name: "Taylor (ln(1+x))", nameHe: "טיילור (ln(1+x))", math: "\\ln(1+x) = \\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}x^n}{n}", latex: "\\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}x^n}{n}" },
      { name: "Taylor (1/(1-x))", nameHe: "טיילור (1/(1-x))", math: "\\frac{1}{1-x} = \\sum_{n=0}^{\\infty}x^n,\\;|x|<1", latex: "\\sum_{n=0}^{\\infty}x^n" },
      { name: "Ratio Test", nameHe: "מבחן המנה", math: "L=\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|: L<1\\Rightarrow\\text{conv.}", latex: "\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|" },
    ],
  },
  /* ──────────── MULTIVARIABLE CALCULUS ──────────── */
  {
    title: "Multivariable Calculus",
    titleHe: "חדו\"א רב-משתני",
    icon: "3d_rotation",
    formulas: [
      { name: "Partial Derivative", nameHe: "נגזרת חלקית", math: "\\frac{\\partial f}{\\partial x} = \\lim_{h\\to0}\\frac{f(x+h,y)-f(x,y)}{h}", latex: "\\frac{\\partial f}{\\partial x}" },
      { name: "Gradient", nameHe: "גרדיאנט", math: "\\nabla f = \\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}, \\frac{\\partial f}{\\partial z}\\right)", latex: "\\nabla f" },
      { name: "Directional Derivative", nameHe: "נגזרת כיוונית", math: "D_{\\hat{u}}f = \\nabla f \\cdot \\hat{u}", latex: "\\nabla f \\cdot \\hat{u}" },
      { name: "Divergence", nameHe: "דיברגנציה", math: "\\nabla\\cdot\\vec{F} = \\frac{\\partial P}{\\partial x}+\\frac{\\partial Q}{\\partial y}+\\frac{\\partial R}{\\partial z}", latex: "\\frac{\\partial P}{\\partial x}+\\frac{\\partial Q}{\\partial y}+\\frac{\\partial R}{\\partial z}" },
      { name: "Curl", nameHe: "רוטור", math: "\\nabla\\times\\vec{F} = \\begin{vmatrix}\\vec{i}&\\vec{j}&\\vec{k}\\\\\\partial_x&\\partial_y&\\partial_z\\\\P&Q&R\\end{vmatrix}", latex: "\\nabla\\times\\vec{F}" },
      { name: "Laplacian", nameHe: "לפלסיאן", math: "\\nabla^2 f = \\frac{\\partial^2 f}{\\partial x^2}+\\frac{\\partial^2 f}{\\partial y^2}+\\frac{\\partial^2 f}{\\partial z^2}", latex: "\\nabla^2 f" },
      { name: "Chain Rule (multi)", nameHe: "כלל שרשרת (רב-משתני)", math: "\\frac{dz}{dt}=\\frac{\\partial z}{\\partial x}\\frac{dx}{dt}+\\frac{\\partial z}{\\partial y}\\frac{dy}{dt}", latex: "\\frac{\\partial z}{\\partial x}\\frac{dx}{dt}+\\frac{\\partial z}{\\partial y}\\frac{dy}{dt}" },
      { name: "Green's Theorem", nameHe: "משפט גרין", math: "\\oint_C(P\\,dx+Q\\,dy)=\\iint_D\\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)dA", latex: "\\iint_D\\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)dA" },
      { name: "Stokes' Theorem", nameHe: "משפט סטוקס", math: "\\oint_C\\vec{F}\\cdot d\\vec{r}=\\iint_S(\\nabla\\times\\vec{F})\\cdot d\\vec{S}", latex: "\\iint_S(\\nabla\\times\\vec{F})\\cdot d\\vec{S}" },
      { name: "Gauss' Divergence", nameHe: "משפט גאוס", math: "\\oiint_S\\vec{F}\\cdot d\\vec{S}=\\iiint_V(\\nabla\\cdot\\vec{F})\\,dV", latex: "\\iiint_V(\\nabla\\cdot\\vec{F})\\,dV" },
      { name: "Jacobian (2D)", nameHe: "יעקוביאן (2D)", math: "\\frac{\\partial(x,y)}{\\partial(u,v)}=\\begin{vmatrix}x_u&x_v\\\\y_u&y_v\\end{vmatrix}", latex: "\\begin{vmatrix}x_u&x_v\\\\y_u&y_v\\end{vmatrix}" },
    ],
  },
  /* ──────────── DIFFERENTIAL EQUATIONS ──────────── */
  {
    title: "Differential Equations",
    titleHe: "משוואות דיפרנציאליות",
    icon: "sync_alt",
    formulas: [
      { name: "Separable", nameHe: "ניתנת להפרדה", math: "\\frac{dy}{dx}=f(x)g(y) \\Rightarrow \\int\\frac{dy}{g(y)}=\\int f(x)\\,dx", latex: "\\int\\frac{dy}{g(y)}=\\int f(x)\\,dx" },
      { name: "1st Order Linear", nameHe: "ליניארית מסדר ראשון", math: "y'+P(x)y=Q(x),\\;\\mu=e^{\\int P\\,dx}", latex: "\\mu=e^{\\int P\\,dx}" },
      { name: "Integrating Factor", nameHe: "גורם אינטגרציה", math: "(\\mu y)'=\\mu Q \\Rightarrow y=\\frac{1}{\\mu}\\int\\mu Q\\,dx", latex: "y=\\frac{1}{\\mu}\\int\\mu Q\\,dx" },
      { name: "2nd Order (const. coeff.)", nameHe: "מסדר שני (מקדמים קבועים)", math: "ay''+by'+cy=0 \\Rightarrow ar^2+br+c=0", latex: "ar^2+br+c=0" },
      { name: "Distinct Real Roots", nameHe: "שורשים ממשיים שונים", math: "y = C_1 e^{r_1 x} + C_2 e^{r_2 x}", latex: "C_1 e^{r_1 x} + C_2 e^{r_2 x}" },
      { name: "Repeated Root", nameHe: "שורש כפול", math: "y = (C_1 + C_2 x)e^{rx}", latex: "(C_1 + C_2 x)e^{rx}" },
      { name: "Complex Roots α±βi", nameHe: "שורשים מרוכבים", math: "y = e^{\\alpha x}(C_1\\cos\\beta x + C_2\\sin\\beta x)", latex: "e^{\\alpha x}(C_1\\cos\\beta x + C_2\\sin\\beta x)" },
      { name: "Variation of Parameters", nameHe: "שינוי פרמטרים", math: "y_p = u_1 y_1 + u_2 y_2,\\; W = y_1 y_2' - y_2 y_1'", latex: "y_p = u_1 y_1 + u_2 y_2" },
      { name: "Exact Equation", nameHe: "משוואה מדויקת", math: "M\\,dx+N\\,dy=0,\\;\\frac{\\partial M}{\\partial y}=\\frac{\\partial N}{\\partial x}", latex: "\\frac{\\partial M}{\\partial y}=\\frac{\\partial N}{\\partial x}" },
      { name: "Bernoulli Equation", nameHe: "משוואת ברנולי", math: "y'+P(x)y=Q(x)y^n,\\;v=y^{1-n}", latex: "v=y^{1-n}" },
    ],
  },
  /* ──────────── LINEAR ALGEBRA ──────────── */
  {
    title: "Linear Algebra",
    titleHe: "אלגברה ליניארית",
    icon: "grid_view",
    formulas: [
      { name: "2×2 Determinant", nameHe: "דטרמיננטה 2×2", math: "\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad-bc", latex: "ad-bc" },
      { name: "3×3 Determinant", nameHe: "דטרמיננטה 3×3", math: "\\det(A) = a(ei-fh)-b(di-fg)+c(dh-eg)", latex: "a(ei-fh)-b(di-fg)+c(dh-eg)" },
      { name: "Eigenvalue Equation", nameHe: "משוואת ערך עצמי", math: "A\\vec{v} = \\lambda\\vec{v}", latex: "A\\vec{v} = \\lambda\\vec{v}" },
      { name: "Characteristic Polynomial", nameHe: "פולינום אופייני", math: "\\det(A-\\lambda I)=0", latex: "\\det(A-\\lambda I)=0" },
      { name: "Inverse (2×2)", nameHe: "הופכית (2×2)", math: "A^{-1}=\\frac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}", latex: "\\frac{1}{\\det(A)}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}" },
      { name: "Rank-Nullity", nameHe: "דרגה-אפסיות", math: "\\text{rank}(A)+\\text{nullity}(A)=n", latex: "\\text{rank}(A)+\\text{nullity}(A)=n" },
      { name: "Cramer's Rule", nameHe: "כלל קרמר", math: "x_i = \\frac{\\det(A_i)}{\\det(A)}", latex: "\\frac{\\det(A_i)}{\\det(A)}" },
      { name: "Dot Product", nameHe: "מכפלה סקלרית", math: "\\vec{u}\\cdot\\vec{v}=|\\vec{u}||\\vec{v}|\\cos\\theta", latex: "\\vec{u}\\cdot\\vec{v}=|\\vec{u}||\\vec{v}|\\cos\\theta" },
      { name: "Cross Product", nameHe: "מכפלה וקטורית", math: "|\\vec{u}\\times\\vec{v}|=|\\vec{u}||\\vec{v}|\\sin\\theta", latex: "|\\vec{u}\\times\\vec{v}|=|\\vec{u}||\\vec{v}|\\sin\\theta" },
      { name: "Projection", nameHe: "הטלה", math: "\\text{proj}_{\\vec{v}}\\vec{u}=\\frac{\\vec{u}\\cdot\\vec{v}}{\\vec{v}\\cdot\\vec{v}}\\vec{v}", latex: "\\frac{\\vec{u}\\cdot\\vec{v}}{\\vec{v}\\cdot\\vec{v}}\\vec{v}" },
      { name: "Gram-Schmidt", nameHe: "גרם-שמידט", math: "\\vec{u}_k = \\vec{v}_k - \\sum_{j=1}^{k-1}\\text{proj}_{\\vec{u}_j}\\vec{v}_k", latex: "\\vec{v}_k - \\sum_{j=1}^{k-1}\\text{proj}_{\\vec{u}_j}\\vec{v}_k" },
      { name: "Cayley-Hamilton", nameHe: "קיילי-המילטון", math: "A \\text{ satisfies its characteristic polynomial}", latex: "p(A) = 0" },
    ],
  },
  /* ──────────── COMPLEX NUMBERS ──────────── */
  {
    title: "Complex Numbers",
    titleHe: "מספרים מרוכבים",
    icon: "rotate_right",
    formulas: [
      { name: "Euler's Formula", nameHe: "נוסחת אוילר", math: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", latex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta" },
      { name: "Euler's Identity", nameHe: "זהות אוילר", math: "e^{i\\pi} + 1 = 0", latex: "e^{i\\pi} + 1 = 0" },
      { name: "Polar Form", nameHe: "צורה פולרית", math: "z = r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}", latex: "re^{i\\theta}" },
      { name: "Modulus", nameHe: "ערך מוחלט", math: "|z| = \\sqrt{a^2 + b^2}", latex: "\\sqrt{a^2 + b^2}" },
      { name: "Conjugate", nameHe: "צמוד", math: "\\overline{a+bi} = a-bi,\\; z\\bar{z}=|z|^2", latex: "z\\bar{z}=|z|^2" },
      { name: "DeMoivre's Theorem", nameHe: "משפט דה-מואבר", math: "(re^{i\\theta})^n = r^n e^{in\\theta}", latex: "r^n e^{in\\theta}" },
      { name: "nth Roots", nameHe: "שורשים מסדר n", math: "z_k = r^{1/n}e^{i(\\theta+2\\pi k)/n},\\; k=0,...,n-1", latex: "r^{1/n}e^{i(\\theta+2\\pi k)/n}" },
      { name: "Multiplication", nameHe: "כפל", math: "r_1 e^{i\\theta_1}\\cdot r_2 e^{i\\theta_2}=r_1 r_2 e^{i(\\theta_1+\\theta_2)}", latex: "r_1 r_2 e^{i(\\theta_1+\\theta_2)}" },
    ],
  },
  /* ──────────── LAPLACE TRANSFORMS ──────────── */
  {
    title: "Laplace Transforms",
    titleHe: "התמרות לפלס",
    icon: "transform",
    formulas: [
      { name: "Definition", nameHe: "הגדרה", math: "\\mathcal{L}\\{f(t)\\} = \\int_0^{\\infty}e^{-st}f(t)\\,dt", latex: "\\int_0^{\\infty}e^{-st}f(t)\\,dt" },
      { name: "L{1}", nameHe: "L{1}", math: "\\mathcal{L}\\{1\\} = \\frac{1}{s}", latex: "\\frac{1}{s}" },
      { name: "L{tⁿ}", nameHe: "L{tⁿ}", math: "\\mathcal{L}\\{t^n\\} = \\frac{n!}{s^{n+1}}", latex: "\\frac{n!}{s^{n+1}}" },
      { name: "L{eᵃᵗ}", nameHe: "L{eᵃᵗ}", math: "\\mathcal{L}\\{e^{at}\\} = \\frac{1}{s-a}", latex: "\\frac{1}{s-a}" },
      { name: "L{sin(at)}", nameHe: "L{sin(at)}", math: "\\mathcal{L}\\{\\sin(at)\\} = \\frac{a}{s^2+a^2}", latex: "\\frac{a}{s^2+a^2}" },
      { name: "L{cos(at)}", nameHe: "L{cos(at)}", math: "\\mathcal{L}\\{\\cos(at)\\} = \\frac{s}{s^2+a^2}", latex: "\\frac{s}{s^2+a^2}" },
      { name: "L{t·f(t)}", nameHe: "L{t·f(t)}", math: "\\mathcal{L}\\{t\\cdot f(t)\\} = -F'(s)", latex: "-F'(s)" },
      { name: "L{f'(t)}", nameHe: "L{f'(t)}", math: "\\mathcal{L}\\{f'\\} = sF(s)-f(0)", latex: "sF(s)-f(0)" },
      { name: "L{f''(t)}", nameHe: "L{f''(t)}", math: "\\mathcal{L}\\{f''\\} = s^2F(s)-sf(0)-f'(0)", latex: "s^2F(s)-sf(0)-f'(0)" },
      { name: "Convolution", nameHe: "קונבולוציה", math: "\\mathcal{L}\\{f*g\\} = F(s)\\cdot G(s)", latex: "F(s)\\cdot G(s)" },
      { name: "s-Shift", nameHe: "הזזה ב-s", math: "\\mathcal{L}\\{e^{at}f(t)\\} = F(s-a)", latex: "F(s-a)" },
    ],
  },
  /* ──────────── FOURIER SERIES ──────────── */
  {
    title: "Fourier Series",
    titleHe: "טורי פורייה",
    icon: "equalizer",
    formulas: [
      { name: "Fourier Series", nameHe: "טור פורייה", math: "f(x)=\\frac{a_0}{2}+\\sum_{n=1}^{\\infty}\\left(a_n\\cos\\frac{n\\pi x}{L}+b_n\\sin\\frac{n\\pi x}{L}\\right)", latex: "\\frac{a_0}{2}+\\sum(a_n\\cos+b_n\\sin)" },
      { name: "a₀ Coefficient", nameHe: "מקדם a₀", math: "a_0 = \\frac{1}{L}\\int_{-L}^{L}f(x)\\,dx", latex: "\\frac{1}{L}\\int_{-L}^{L}f(x)\\,dx" },
      { name: "aₙ Coefficient", nameHe: "מקדם aₙ", math: "a_n = \\frac{1}{L}\\int_{-L}^{L}f(x)\\cos\\frac{n\\pi x}{L}\\,dx", latex: "\\frac{1}{L}\\int_{-L}^{L}f(x)\\cos\\frac{n\\pi x}{L}\\,dx" },
      { name: "bₙ Coefficient", nameHe: "מקדם bₙ", math: "b_n = \\frac{1}{L}\\int_{-L}^{L}f(x)\\sin\\frac{n\\pi x}{L}\\,dx", latex: "\\frac{1}{L}\\int_{-L}^{L}f(x)\\sin\\frac{n\\pi x}{L}\\,dx" },
      { name: "Parseval's Theorem", nameHe: "משפט פרסבל", math: "\\frac{1}{L}\\int_{-L}^{L}|f|^2\\,dx = \\frac{a_0^2}{2}+\\sum_{n=1}^{\\infty}(a_n^2+b_n^2)", latex: "\\frac{a_0^2}{2}+\\sum(a_n^2+b_n^2)" },
      { name: "Complex Form", nameHe: "צורה מרוכבת", math: "f(x)=\\sum_{n=-\\infty}^{\\infty}c_n e^{in\\pi x/L}", latex: "\\sum c_n e^{in\\pi x/L}" },
    ],
  },
  /* ──────────── PROBABILITY & STATISTICS ──────────── */
  {
    title: "Probability & Statistics",
    titleHe: "הסתברות וסטטיסטיקה",
    icon: "casino",
    formulas: [
      { name: "Bayes' Theorem", nameHe: "משפט בייס", math: "P(A|B) = \\frac{P(B|A)P(A)}{P(B)}", latex: "\\frac{P(B|A)P(A)}{P(B)}" },
      { name: "Expected Value", nameHe: "תוחלת", math: "E[X] = \\sum x_i P(x_i) = \\int x f(x)\\,dx", latex: "\\sum x_i P(x_i)" },
      { name: "Variance", nameHe: "שונות", math: "\\text{Var}(X) = E[X^2] - (E[X])^2", latex: "E[X^2] - (E[X])^2" },
      { name: "Standard Deviation", nameHe: "סטיית תקן", math: "\\sigma = \\sqrt{\\text{Var}(X)}", latex: "\\sqrt{\\text{Var}(X)}" },
      { name: "Binomial", nameHe: "בינומי", math: "P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}", latex: "\\binom{n}{k}p^k(1-p)^{n-k}" },
      { name: "Poisson", nameHe: "פואסון", math: "P(X=k)=\\frac{\\lambda^k e^{-\\lambda}}{k!}", latex: "\\frac{\\lambda^k e^{-\\lambda}}{k!}" },
      { name: "Normal (PDF)", nameHe: "התפלגות נורמלית", math: "f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-(x-\\mu)^2/(2\\sigma^2)}", latex: "\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-(x-\\mu)^2/(2\\sigma^2)}" },
      { name: "Combinations", nameHe: "צירופים", math: "\\binom{n}{k} = \\frac{n!}{k!(n-k)!}", latex: "\\frac{n!}{k!(n-k)!}" },
    ],
  },
  /* ──────────── PHYSICS ──────────── */
  {
    title: "Physics — Mechanics & E&M",
    titleHe: "פיזיקה — מכניקה וחשמל",
    icon: "rocket_launch",
    formulas: [
      { name: "Newton's 2nd Law", nameHe: "חוק שני של ניוטון", math: "\\vec{F} = m\\vec{a}", latex: "F = m \\cdot a" },
      { name: "Kinematics (v)", nameHe: "קינמטיקה (v)", math: "v = v_0 + at", latex: "v_0 + at" },
      { name: "Kinematics (x)", nameHe: "קינמטיקה (x)", math: "x = x_0 + v_0 t + \\frac{1}{2}at^2", latex: "x_0 + v_0 t + \\frac{1}{2}at^2" },
      { name: "v² Equation", nameHe: "משוואת v²", math: "v^2 = v_0^2 + 2a(x-x_0)", latex: "v_0^2 + 2a(x-x_0)" },
      { name: "Kinetic Energy", nameHe: "אנרגיה קינטית", math: "KE = \\frac{1}{2}mv^2", latex: "\\frac{1}{2}mv^2" },
      { name: "Work-Energy", nameHe: "עבודה-אנרגיה", math: "W_{\\text{net}} = \\Delta KE", latex: "W = \\Delta KE" },
      { name: "Momentum", nameHe: "תנע", math: "\\vec{p} = m\\vec{v}", latex: "m\\vec{v}" },
      { name: "Centripetal Accel.", nameHe: "תאוצה צנטריפטלית", math: "a_c = \\frac{v^2}{r}", latex: "\\frac{v^2}{r}" },
      { name: "Spring Frequency", nameHe: "תדירות קפיץ", math: "\\omega = \\sqrt{\\frac{k}{m}},\\; T = \\frac{2\\pi}{\\omega}", latex: "\\omega = \\sqrt{\\frac{k}{m}}" },
      { name: "Coulomb's Law", nameHe: "חוק קולון", math: "F = k_e \\frac{|q_1 q_2|}{r^2}", latex: "k_e \\frac{|q_1 q_2|}{r^2}" },
      { name: "Electric Field", nameHe: "שדה חשמלי", math: "\\vec{E} = \\frac{\\vec{F}}{q} = k_e\\frac{Q}{r^2}\\hat{r}", latex: "k_e\\frac{Q}{r^2}" },
      { name: "Ohm's Law", nameHe: "חוק אוהם", math: "V = IR", latex: "V = IR" },
      { name: "Power (Electric)", nameHe: "הספק חשמלי", math: "P = IV = I^2 R = \\frac{V^2}{R}", latex: "P = IV" },
      { name: "Gauss' Law (E)", nameHe: "חוק גאוס (חשמל)", math: "\\oint\\vec{E}\\cdot d\\vec{A}=\\frac{Q_{\\text{enc}}}{\\epsilon_0}", latex: "\\frac{Q_{\\text{enc}}}{\\epsilon_0}" },
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
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const lang = typeof window !== "undefined" ? (localStorage.getItem("mathpad.lang") as Lang || "en") : "en";
  const isRtl = lang === "he";

  if (!isOpen) return null;

  const handleCopy = (latex: string, indexStr: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedIndex(indexStr);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const totalFormulas = FORMULAS.reduce((sum, c) => sum + c.formulas.length, 0);

  const filteredCategories = FORMULAS.map((category, idx) => {
    const formulas = category.formulas.filter((f) => {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.nameHe.includes(q) ||
        f.latex.toLowerCase().includes(q) ||
        f.math.toLowerCase().includes(q)
      );
    });
    return { ...category, formulas, originalIdx: idx };
  }).filter((category) => category.formulas.length > 0);

  const matchCount = filteredCategories.reduce((sum, c) => sum + c.formulas.length, 0);

  return (
    <aside
      dir={isRtl ? "rtl" : "ltr"}
      className={`fixed top-0 bottom-0 z-40 w-[420px] max-w-[95vw] bg-surface-container-lowest shadow-2xl border-l border-outline-variant/60 flex flex-col transition-all duration-300 ${
        isRtl ? "left-0" : "right-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">menu_book</span>
          <h2 className="note-title text-lg font-bold text-on-surface">
            {isRtl ? "נוסחאון מהיר" : "Formula Reference"}
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {totalFormulas}
          </span>
        </div>
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
            placeholder={isRtl ? "חפש נוסחה, משפט, לפלס, אוילר..." : "Search: chain rule, Laplace, Taylor..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-outline hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
        {search && (
          <p className="mt-1 text-[10px] text-outline px-1">
            {matchCount} {isRtl ? "תוצאות" : "results"}
          </p>
        )}
      </div>

      {/* Formulas List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center text-sm text-on-surface-variant py-8">
            {isRtl ? "לא נמצאו נוסחאות מתאימות" : "No formulas found."}
          </div>
        ) : (
          filteredCategories.map((category) => {
            const isCollapsed = !search && collapsed.has(category.originalIdx);
            return (
              <div key={category.originalIdx} className="space-y-2">
                <button
                  onClick={() => toggleCollapse(category.originalIdx)}
                  className="flex w-full items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">{category.icon}</span>
                  <span>{isRtl ? category.titleHe : category.title}</span>
                  <span className="text-[10px] font-normal text-outline">({category.formulas.length})</span>
                  <span className="material-symbols-outlined text-sm ml-auto transition-transform" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)" }}>
                    expand_more
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1.5">
                    {category.formulas.map((formula, fIdx) => {
                      const keyStr = `${category.originalIdx}-${fIdx}`;
                      return (
                        <div
                          key={fIdx}
                          className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 p-2.5 hover:bg-surface-container-low transition-all space-y-1.5 group relative"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[11px] font-semibold text-on-surface leading-tight">
                              {isRtl ? formula.nameHe : formula.name}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onInsertFormula && (
                                <button
                                  onClick={() => onInsertFormula(formula.latex)}
                                  title={isRtl ? "הוסף לטקסט" : "Insert into work"}
                                  className="rounded bg-primary-container text-on-primary-container p-0.5 hover:scale-105 transition-all"
                                >
                                  <span className="material-symbols-outlined text-xs">keyboard_return</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleCopy(formula.latex, keyStr)}
                                title={isRtl ? "העתק נוסחה" : "Copy to clipboard"}
                                className="rounded bg-secondary-container text-on-secondary-container p-0.5 hover:scale-105 transition-all"
                              >
                                <span className="material-symbols-outlined text-xs">
                                  {copiedIndex === keyStr ? "done" : "content_copy"}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className="ruled-paper bg-[#fffefc] rounded border border-outline-variant/20 p-1.5 flex items-center justify-center overflow-x-auto select-all cursor-pointer min-h-[38px] shadow-sm text-sm">
                            <SafeInlineMath math={formula.math} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

/** Render InlineMath with graceful error fallback */
function SafeInlineMath({ math }: { math: string }) {
  try {
    return <InlineMath math={math} />;
  } catch {
    return <code className="text-xs text-error">{math}</code>;
  }
}
