/**
 * Unit Engine — dimensional algebra for engineering quantities.
 *
 * Every Quantity has:
 *   - a numeric value (always stored in SI base units internally)
 *   - a 7-vector of base SI dimensions [L, M, T, I, Θ, N, J]
 *   - an optional display unit string for the UI
 *
 * Operations check dimensions:
 *   - add/sub:   dimensions must match
 *   - mul:       dimensions add
 *   - div:       dimensions subtract
 *   - pow(n):    dimensions scale by n
 *
 * The Mars Climate Orbiter would still exist if it had used this.
 */

/** [L, M, T, I, Θ, N, J] = length, mass, time, current, temperature, amount, luminosity */
export type Dim = readonly [number, number, number, number, number, number, number];
export const DIMLESS: Dim = [0, 0, 0, 0, 0, 0, 0];

const DIM_NAMES = ["L", "M", "T", "I", "Θ", "N", "J"] as const;

/** A physical quantity, value stored in SI base units. */
export type Quantity = {
  value: number;
  dim: Dim;
  /** Optional UI-facing unit (e.g. "km/h"). Doesn't affect math, only formatting. */
  displayUnit?: string;
};

export type UnitDef = {
  symbol: string;
  /** Multiplier to convert from this unit to its SI-base equivalent. */
  factor: number;
  /** Linear offset for affine units like °C, °F. v_SI = factor * v + offset. */
  offset?: number;
  dim: Dim;
  /** Optional family for the "swap unit" dropdown (e.g. "length", "energy"). */
  family?: string;
};

// ---------------------------------------------------------------------------
// Base SI units
// ---------------------------------------------------------------------------

const SI_BASE: UnitDef[] = [
  { symbol: "m",   factor: 1, dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "kg",  factor: 1, dim: [0, 1, 0, 0, 0, 0, 0], family: "mass" },
  { symbol: "s",   factor: 1, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "A",   factor: 1, dim: [0, 0, 0, 1, 0, 0, 0], family: "current" },
  { symbol: "K",   factor: 1, dim: [0, 0, 0, 0, 1, 0, 0], family: "temperature" },
  { symbol: "mol", factor: 1, dim: [0, 0, 0, 0, 0, 1, 0], family: "amount" },
  { symbol: "cd",  factor: 1, dim: [0, 0, 0, 0, 0, 0, 1], family: "luminosity" },
];

// ---------------------------------------------------------------------------
// SI derived (named) units
// ---------------------------------------------------------------------------

const SI_DERIVED: UnitDef[] = [
  { symbol: "Hz",  factor: 1, dim: [0, 0, -1, 0, 0, 0, 0], family: "frequency" },
  { symbol: "N",   factor: 1, dim: [1, 1, -2, 0, 0, 0, 0], family: "force" },
  { symbol: "Pa",  factor: 1, dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "J",   factor: 1, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "W",   factor: 1, dim: [2, 1, -3, 0, 0, 0, 0], family: "power" },
  { symbol: "C",   factor: 1, dim: [0, 0, 1, 1, 0, 0, 0], family: "charge" },
  { symbol: "V",   factor: 1, dim: [2, 1, -3, -1, 0, 0, 0], family: "voltage" },
  { symbol: "F",   factor: 1, dim: [-2, -1, 4, 2, 0, 0, 0], family: "capacitance" },
  { symbol: "Ω",   factor: 1, dim: [2, 1, -3, -2, 0, 0, 0], family: "resistance" },
  { symbol: "ohm", factor: 1, dim: [2, 1, -3, -2, 0, 0, 0], family: "resistance" },
  { symbol: "S",   factor: 1, dim: [-2, -1, 3, 2, 0, 0, 0], family: "conductance" },
  { symbol: "Wb",  factor: 1, dim: [2, 1, -2, -1, 0, 0, 0], family: "magnetic flux" },
  { symbol: "T",   factor: 1, dim: [0, 1, -2, -1, 0, 0, 0], family: "magnetic flux density" },
  { symbol: "H",   factor: 1, dim: [2, 1, -2, -2, 0, 0, 0], family: "inductance" },
  { symbol: "rad", factor: 1, dim: DIMLESS, family: "angle" },
  { symbol: "sr",  factor: 1, dim: DIMLESS, family: "solid angle" },
];

// ---------------------------------------------------------------------------
// Convenience / non-SI / imperial
// ---------------------------------------------------------------------------

const OTHER: UnitDef[] = [
  // mass
  { symbol: "g",   factor: 1e-3, dim: [0, 1, 0, 0, 0, 0, 0], family: "mass" },
  { symbol: "lb",  factor: 0.45359237, dim: [0, 1, 0, 0, 0, 0, 0], family: "mass" },
  { symbol: "oz",  factor: 0.028349523125, dim: [0, 1, 0, 0, 0, 0, 0], family: "mass" },
  { symbol: "ton", factor: 1000, dim: [0, 1, 0, 0, 0, 0, 0], family: "mass" },

  // length
  { symbol: "cm",  factor: 0.01,   dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "mm",  factor: 0.001,  dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "km",  factor: 1000,   dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "in",  factor: 0.0254, dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "ft",  factor: 0.3048, dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "yd",  factor: 0.9144, dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },
  { symbol: "mi",  factor: 1609.344, dim: [1, 0, 0, 0, 0, 0, 0], family: "length" },

  // time
  { symbol: "ms",  factor: 1e-3, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "μs",  factor: 1e-6, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "ns",  factor: 1e-9, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "min", factor: 60,   dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "h",   factor: 3600, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "hr",  factor: 3600, dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },
  { symbol: "day", factor: 86400,dim: [0, 0, 1, 0, 0, 0, 0], family: "time" },

  // volume
  { symbol: "L",   factor: 1e-3, dim: [3, 0, 0, 0, 0, 0, 0], family: "volume" },
  { symbol: "mL",  factor: 1e-6, dim: [3, 0, 0, 0, 0, 0, 0], family: "volume" },
  { symbol: "gal", factor: 0.003785411784, dim: [3, 0, 0, 0, 0, 0, 0], family: "volume" },

  // temperature (linear; absolute, no offset for now beyond K)
  { symbol: "°C", factor: 1, offset: 273.15, dim: [0, 0, 0, 0, 1, 0, 0], family: "temperature" },
  { symbol: "°F", factor: 5 / 9, offset: 255.3722222, dim: [0, 0, 0, 0, 1, 0, 0], family: "temperature" },

  // energy / power
  { symbol: "kJ",   factor: 1000, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "MJ",   factor: 1e6,  dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "cal",  factor: 4.184, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "kcal", factor: 4184,  dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "Wh",   factor: 3600,  dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "kWh",  factor: 3.6e6, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "eV",   factor: 1.602176634e-19, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "BTU",  factor: 1055.06, dim: [2, 1, -2, 0, 0, 0, 0], family: "energy" },
  { symbol: "kW",   factor: 1000, dim: [2, 1, -3, 0, 0, 0, 0], family: "power" },
  { symbol: "MW",   factor: 1e6,  dim: [2, 1, -3, 0, 0, 0, 0], family: "power" },
  { symbol: "hp",   factor: 745.6998715822702, dim: [2, 1, -3, 0, 0, 0, 0], family: "power" },

  // pressure
  { symbol: "kPa", factor: 1000, dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "MPa", factor: 1e6,  dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "bar", factor: 1e5,  dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "psi", factor: 6894.757293168, dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "atm", factor: 101325, dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },
  { symbol: "torr",factor: 133.322387415, dim: [-1, 1, -2, 0, 0, 0, 0], family: "pressure" },

  // angle
  { symbol: "deg", factor: Math.PI / 180, dim: DIMLESS, family: "angle" },
  { symbol: "°",   factor: Math.PI / 180, dim: DIMLESS, family: "angle" },

  // frequency
  { symbol: "kHz", factor: 1000, dim: [0, 0, -1, 0, 0, 0, 0], family: "frequency" },
  { symbol: "MHz", factor: 1e6,  dim: [0, 0, -1, 0, 0, 0, 0], family: "frequency" },
  { symbol: "GHz", factor: 1e9,  dim: [0, 0, -1, 0, 0, 0, 0], family: "frequency" },
  { symbol: "rpm", factor: 2 * Math.PI / 60, dim: [0, 0, -1, 0, 0, 0, 0], family: "angular frequency" },

  // electrical
  { symbol: "mA",  factor: 1e-3, dim: [0, 0, 0, 1, 0, 0, 0], family: "current" },
  { symbol: "μA",  factor: 1e-6, dim: [0, 0, 0, 1, 0, 0, 0], family: "current" },
  { symbol: "mV",  factor: 1e-3, dim: [2, 1, -3, -1, 0, 0, 0], family: "voltage" },
  { symbol: "kV",  factor: 1e3,  dim: [2, 1, -3, -1, 0, 0, 0], family: "voltage" },
  { symbol: "MV",  factor: 1e6,  dim: [2, 1, -3, -1, 0, 0, 0], family: "voltage" },
  { symbol: "kΩ",  factor: 1e3,  dim: [2, 1, -3, -2, 0, 0, 0], family: "resistance" },
  { symbol: "MΩ",  factor: 1e6,  dim: [2, 1, -3, -2, 0, 0, 0], family: "resistance" },
  { symbol: "μF",  factor: 1e-6, dim: [-2, -1, 4, 2, 0, 0, 0], family: "capacitance" },
  { symbol: "nF",  factor: 1e-9, dim: [-2, -1, 4, 2, 0, 0, 0], family: "capacitance" },
  { symbol: "pF",  factor: 1e-12,dim: [-2, -1, 4, 2, 0, 0, 0], family: "capacitance" },
  { symbol: "mH",  factor: 1e-3, dim: [2, 1, -2, -2, 0, 0, 0], family: "inductance" },
  { symbol: "μH",  factor: 1e-6, dim: [2, 1, -2, -2, 0, 0, 0], family: "inductance" },
];

export const UNIT_DB: UnitDef[] = [...SI_BASE, ...SI_DERIVED, ...OTHER];

// Quick lookup
const UNIT_MAP = new Map<string, UnitDef>();
for (const u of UNIT_DB) UNIT_MAP.set(u.symbol, u);

// ---------------------------------------------------------------------------
// SI prefixes (apply to most units; we leave kg/g, °C/°F alone)
// ---------------------------------------------------------------------------

const SI_PREFIXES: Record<string, number> = {
  Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3,
  h: 1e2, da: 1e1, d: 1e-1, c: 1e-2, m: 1e-3, μ: 1e-6, u: 1e-6, n: 1e-9,
  p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24,
};

/** Look up a unit symbol, decomposing an SI prefix if present. */
function lookupUnit(sym: string): UnitDef | null {
  const direct = UNIT_MAP.get(sym);
  if (direct) return direct;
  // Try peeling a prefix
  for (const p of Object.keys(SI_PREFIXES).sort((a, b) => b.length - a.length)) {
    if (sym.startsWith(p) && sym.length > p.length) {
      const rest = sym.slice(p.length);
      const base = UNIT_MAP.get(rest);
      if (base && !base.offset) {
        return {
          symbol: sym,
          factor: SI_PREFIXES[p] * base.factor,
          dim: base.dim,
          family: base.family,
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dimensional algebra
// ---------------------------------------------------------------------------

export function dimEq(a: Dim, b: Dim): boolean {
  for (let i = 0; i < 7; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function dimAdd(a: Dim, b: Dim): Dim {
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3], a[4]+b[4], a[5]+b[5], a[6]+b[6]];
}

export function dimSub(a: Dim, b: Dim): Dim {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3], a[4]-b[4], a[5]-b[5], a[6]-b[6]];
}

export function dimScale(a: Dim, k: number): Dim {
  return [a[0]*k, a[1]*k, a[2]*k, a[3]*k, a[4]*k, a[5]*k, a[6]*k];
}

export class DimensionalError extends Error {
  constructor(op: string, a: Quantity, b: Quantity) {
    super(`Dimensional mismatch in ${op}: ${dimToString(a.dim)} vs ${dimToString(b.dim)}`);
  }
}

export function add(a: Quantity, b: Quantity): Quantity {
  if (!dimEq(a.dim, b.dim)) throw new DimensionalError("addition", a, b);
  return { value: a.value + b.value, dim: a.dim };
}

export function sub(a: Quantity, b: Quantity): Quantity {
  if (!dimEq(a.dim, b.dim)) throw new DimensionalError("subtraction", a, b);
  return { value: a.value - b.value, dim: a.dim };
}

export function mul(a: Quantity, b: Quantity): Quantity {
  return { value: a.value * b.value, dim: dimAdd(a.dim, b.dim) };
}

export function div(a: Quantity, b: Quantity): Quantity {
  return { value: a.value / b.value, dim: dimSub(a.dim, b.dim) };
}

export function pow(a: Quantity, n: number): Quantity {
  return { value: Math.pow(a.value, n), dim: dimScale(a.dim, n) };
}

// ---------------------------------------------------------------------------
// Parser:  "5 m/s^2"  →  Quantity
//          "kg*m/s^2" →  unit-only (value = 1, dim derived)
// ---------------------------------------------------------------------------

/** Parse a compound unit expression like "m/s^2" or "kg·m/s²" or "N·m". */
export function parseUnitExpr(expr: string): { factor: number; dim: Dim } {
  let s = expr.trim()
    .replace(/·/g, "*").replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁻¹/g, "^-1").replace(/⁻²/g, "^-2");

  // Tokenize on * and /
  // We treat top-level "/" as dividing; "x/y/z" = x/(y*z) by left-to-right
  let factor = 1;
  let dim: Dim = DIMLESS;
  let op: "*" | "/" = "*";
  let buf = "";

  function flush() {
    if (!buf.trim()) return;
    // buf could be "kg" or "m^2" or "(m^2)" etc.
    let t = buf.trim();
    // strip surrounding parens
    while (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1);
    const m = /^([A-Za-zμΩ°]+)(?:\^(-?\d+))?$/.exec(t);
    if (!m) throw new Error(`Unrecognized unit token: "${t}"`);
    const [, sym, expStr] = m;
    const exp = expStr ? parseInt(expStr, 10) : 1;
    const u = lookupUnit(sym);
    if (!u) throw new Error(`Unknown unit: "${sym}"`);
    const sign = op === "/" ? -1 : 1;
    factor *= Math.pow(u.factor, sign * exp);
    dim = dimAdd(dim, dimScale(u.dim, sign * exp));
    buf = "";
  }

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "*" || c === "/") {
      flush();
      op = c as "*" | "/";
    } else if (c === " ") {
      // whitespace inside an expression means implicit multiplication, e.g. "kg m"
      if (buf.trim()) {
        flush();
        op = "*";
      }
    } else {
      buf += c;
    }
  }
  flush();
  return { factor, dim };
}

/** Parse a full quantity string like "5 m/s^2" or "9.81 m/s²". */
export function parseQuantity(input: string): Quantity | null {
  const m = /^\s*([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*(.+?)\s*$/.exec(input);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = m[2].trim();
  if (!unit) return { value, dim: DIMLESS, displayUnit: "" };
  try {
    const { factor, dim } = parseUnitExpr(unit);
    return { value: value * factor, dim, displayUnit: unit };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function dimToString(d: Dim): string {
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (d[i] !== 0) {
      parts.push(d[i] === 1 ? DIM_NAMES[i] : `${DIM_NAMES[i]}^${d[i]}`);
    }
  }
  return parts.length ? parts.join("·") : "[dimensionless]";
}

/** Try to find a single named unit that matches this dimension. */
export function nameFor(d: Dim): UnitDef | null {
  for (const u of UNIT_DB) {
    if (dimEq(u.dim, d) && u.factor === 1 && !u.offset) return u;
  }
  return null;
}

/** Format a Quantity. If a single named unit matches, use it; else the display unit; else base SI string. */
export function format(q: Quantity, opts?: { sigFigs?: number; preferUnit?: string }): string {
  const sig = opts?.sigFigs ?? 4;
  if (opts?.preferUnit) {
    const u = lookupUnit(opts.preferUnit) ?? (() => {
      try { return { symbol: opts.preferUnit!, ...parseUnitExpr(opts.preferUnit!), dim: parseUnitExpr(opts.preferUnit!).dim }; }
      catch { return null; }
    })();
    if (u && dimEq(u.dim, q.dim)) {
      const v = q.value / (u.factor ?? 1);
      return `${formatNum(v, sig)} ${opts.preferUnit}`;
    }
  }
  const named = nameFor(q.dim);
  if (named) return `${formatNum(q.value, sig)} ${named.symbol}`;
  if (q.displayUnit) return `${formatNum(q.value, sig)} ${q.displayUnit}`;
  if (dimEq(q.dim, DIMLESS)) return `${formatNum(q.value, sig)}`;
  return `${formatNum(q.value, sig)} ${dimToString(q.dim)}`;
}

function formatNum(n: number, sig: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e6 || abs < 1e-3) return n.toExponential(Math.max(0, sig - 1));
  return Number(n.toPrecision(sig)).toString();
}

// ---------------------------------------------------------------------------
// Convert between unit symbols (for the swap dropdown)
// ---------------------------------------------------------------------------

/** Convert a numeric value from one unit to another. Throws if dimensions don't match. */
export function convert(value: number, fromUnit: string, toUnit: string): number {
  const from = parseUnitExpr(fromUnit);
  const to   = parseUnitExpr(toUnit);
  if (!dimEq(from.dim, to.dim)) {
    throw new Error(`Can't convert ${fromUnit} → ${toUnit}: dimensions differ`);
  }
  return (value * from.factor) / to.factor;
}

/** All units in the same family — used by the swap-unit dropdown. */
export function alternativesFor(unitSymbol: string): UnitDef[] {
  const u = lookupUnit(unitSymbol);
  if (!u) return [];
  return UNIT_DB.filter((x) => dimEq(x.dim, u.dim));
}

// ---------------------------------------------------------------------------
// One-shot helper: extract every "<number> <unit>" token from a string of math
// ---------------------------------------------------------------------------

/** Used by the grader prompt assist: pull all quantities from a student's line. */
export function extractQuantities(text: string): Quantity[] {
  const out: Quantity[] = [];
  // Match "12.5 m/s^2" or "9.8 m/s²" or "1.602e-19 C"
  const re = /(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*([A-Za-zμΩ°][A-Za-zμΩ°·*/^\d\-²³⁻¹]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const q = parseQuantity(`${m[1]} ${m[2]}`);
    if (q) out.push(q);
  }
  return out;
}
