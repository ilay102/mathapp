/**
 * Safe-ish single-variable math expression compiler.
 * Accepts the small subset of math the grader is asked to return for graphs:
 *   numbers, x, + - * / ^ ( ), and named functions: sin cos tan exp log ln sqrt abs
 *   constants: pi e
 *
 * Strategy:
 *  1. Normalize the source to JS using `Math.*` for functions and `**` for powers.
 *  2. Validate the normalized string against an allowlist regex — reject anything else.
 *  3. Compile via `new Function`. Even if a clever input slips past, the only globals
 *     reachable are `Math.*`; we run with strict mode and a single bound `x` arg.
 */
const FUNCS = new Set(["sin","cos","tan","asin","acos","atan","exp","log","ln","sqrt","abs","sinh","cosh","tanh","floor","ceil","round"]);

export function compileExpr(src: string): ((x: number) => number) | null {
  if (!src || typeof src !== "string") return null;
  let s = src.trim();
  // Strip any leading LaTeX delimiters or "f(x) ="
  s = s.replace(/^\$+|\$+$/g, "").trim();
  s = s.replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, "").trim();
  s = s.replace(/^y\s*=\s*/i, "").trim();
  // LaTeX-ish → JS
  s = s.replace(/\\cdot/g, "*")
       .replace(/\\times/g, "*")
       .replace(/\\div/g, "/")
       .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))")
       .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
       .replace(/\\([a-zA-Z]+)/g, "$1")   // strip remaining LaTeX backslashes
       .replace(/\^/g, "**")
       .replace(/π/g, "pi")
       .replace(/[⋅·×]/g, "*");
  // Unicode superscripts → ^
  const supMap: Record<string,string> = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9" };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => "**" + supMap[c]);
  // Implicit multiplication: 2x → 2*x ; 3sin(x) → 3*sin(x) ; )x → )*x ; (x)(y) → (x)*(y)
  s = s.replace(/(\d)\s*([a-zA-Z_(])/g, "$1*$2");
  s = s.replace(/\)\s*([a-zA-Z_(])/g, ")*$1");
  // Identifier followed by ( — keep as a call ONLY for known functions; else insert *
  s = s.replace(/([a-zA-Z_]\w*)\s*\(/g, (_m, name) => {
    return FUNCS.has(name.toLowerCase()) ? `${name}(` : `${name}*(`;
  });

  // Now rewrite function names to Math.* and constants
  s = s.replace(/\bln\b/g, "Math.log");
  for (const f of FUNCS) {
    if (f === "ln") continue;
    s = s.replace(new RegExp(`\\b${f}\\b`, "g"), `Math.${f}`);
  }
  s = s.replace(/\bpi\b/g, "Math.PI").replace(/\be\b/g, "Math.E");
  // Collapse repeated **
  s = s.replace(/\*\*\s*\*\*/g, "**");

  // Strict allowlist: digits, x, operators, dots, parens, whitespace, and "Math.<name>"
  const stripped = s.replace(/Math\.[A-Za-z_]+/g, "M");
  if (!/^[\dxM+\-*/().\s]+$/.test(stripped)) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function("x", `'use strict'; return (${s});`) as (x: number) => number;
    // Smoke test
    const sample = fn(1);
    if (typeof sample !== "number") return null;
    return fn;
  } catch {
    return null;
  }
}

export type Sample = { x: number; y: number | null };

export function sampleFn(fn: (x: number) => number, x0: number, x1: number, n = 240): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    let y: number | null;
    try {
      const v = fn(x);
      y = Number.isFinite(v) ? v : null;
    } catch { y = null; }
    out.push({ x, y });
  }
  return out;
}

export function clampYRange(samples: Sample[]): [number, number] {
  const ys = samples.map((s) => s.y).filter((y): y is number => y !== null).sort((a, b) => a - b);
  if (ys.length === 0) return [-1, 1];
  const lo = ys[Math.floor(ys.length * 0.01)];
  const hi = ys[Math.floor(ys.length * 0.99)];
  if (lo === hi) return [lo - 1, hi + 1];
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

/** Find approximate zeros, maxima, minima from a sampled curve. Bracket-and-refine for zeros. */
export type Annotation = { x: number; y: number; kind: "zero" | "max" | "min" };

export function findFeatures(samples: Sample[], fn?: (x: number) => number): Annotation[] {
  const out: Annotation[] = [];
  if (samples.length < 3) return out;

  // 1. Zeros: sign change between consecutive defined samples.
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.y === null || b.y === null) continue;
    if (a.y === 0) { out.push({ x: a.x, y: 0, kind: "zero" }); continue; }
    if (a.y * b.y < 0) {
      // refine via 6 bisection steps for sub-pixel accuracy
      let lo = a.x, hi = b.x;
      let yLo = a.y, yHi = b.y;
      if (fn) {
        for (let k = 0; k < 12; k++) {
          const mid = (lo + hi) / 2;
          let mY: number;
          try { mY = fn(mid); } catch { break; }
          if (!Number.isFinite(mY)) break;
          if (mY === 0) { lo = hi = mid; yLo = yHi = 0; break; }
          if (mY * yLo < 0) { hi = mid; yHi = mY; } else { lo = mid; yLo = mY; }
        }
      }
      out.push({ x: (lo + hi) / 2, y: 0, kind: "zero" });
    }
  }

  // 2. Local extrema: a sample is a local max if both neighbors are strictly lower (and vice versa).
  //    Use a small window (±2) to suppress noise from sampling jitter.
  for (let i = 2; i < samples.length - 2; i++) {
    const s = samples[i];
    if (s.y === null) continue;
    const ys = [samples[i - 2].y, samples[i - 1].y, samples[i + 1].y, samples[i + 2].y];
    if (ys.some((y) => y === null)) continue;
    const others = ys as number[];
    if (others.every((y) => s.y! > y)) out.push({ x: s.x, y: s.y, kind: "max" });
    else if (others.every((y) => s.y! < y)) out.push({ x: s.x, y: s.y, kind: "min" });
  }

  return out;
}

/** Riemann-sum area approximation (used to label the shaded integral). */
export function definiteIntegral(fn: (x: number) => number, a: number, b: number, n = 400): number {
  if (a === b) return 0;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const dx = (hi - lo) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const xMid = lo + (i + 0.5) * dx;
    try { const y = fn(xMid); if (Number.isFinite(y)) sum += y; } catch { /* skip */ }
  }
  const signed = sum * dx;
  return a > b ? -signed : signed;
}

export function compileExpr3D(src: string): ((x: number, y: number) => number) | null {
  if (!src || typeof src !== "string") return null;
  let s = src.trim();
  s = s.replace(/^\$+|\$+$/g, "").trim();
  s = s.replace(/^f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*/i, "").trim();
  s = s.replace(/^z\s*=\s*/i, "").trim();
  s = s.replace(/\\cdot/g, "*")
       .replace(/\\times/g, "*")
       .replace(/\\div/g, "/")
       .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))")
       .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
       .replace(/\\([a-zA-Z]+)/g, "$1")
       .replace(/\^/g, "**")
       .replace(/π/g, "pi")
       .replace(/[⋅·×]/g, "*");

  const supMap: Record<string,string> = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9" };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => "**" + supMap[c]);
  s = s.replace(/(\d)\s*([a-zA-Z_(])/g, "$1*$2");
  s = s.replace(/\)\s*([a-zA-Z_(])/g, ")*$1");
  s = s.replace(/([a-zA-Z_]\w*)\s*\(/g, (_m, name) => {
    return FUNCS.has(name.toLowerCase()) ? `${name}(` : `${name}*(`;
  });

  s = s.replace(/\bln\b/g, "Math.log");
  for (const f of FUNCS) {
    if (f === "ln") continue;
    s = s.replace(new RegExp(`\\b${f}\\b`, "g"), `Math.${f}`);
  }
  s = s.replace(/\bpi\b/g, "Math.PI").replace(/\be\b/g, "Math.E");
  s = s.replace(/\*\*\s*\*\*/g, "**");

  const stripped = s.replace(/Math\.[A-Za-z_]+/g, "M");
  if (!/^[\dxMy+\-*/().\s]+$/.test(stripped)) return null;

  try {
    const fn = new Function("x", "y", `'use strict'; return (${s});`) as (x: number, y: number) => number;
    const sample = fn(1, 1);
    if (typeof sample !== "number") return null;
    return fn;
  } catch {
    return null;
  }
}
