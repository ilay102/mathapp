"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang };

type UnitCategory = {
  name: string;
  nameHe: string;
  icon: string;
  units: { id: string; label: string; labelHe: string; toBase: number; offset?: number }[];
};

const CATEGORIES: UnitCategory[] = [
  {
    name: "Length", nameHe: "אורך", icon: "straighten",
    units: [
      { id: "m", label: "Meter (m)", labelHe: "מטר (m)", toBase: 1 },
      { id: "km", label: "Kilometer (km)", labelHe: "קילומטר (km)", toBase: 1000 },
      { id: "cm", label: "Centimeter (cm)", labelHe: "סנטימטר (cm)", toBase: 0.01 },
      { id: "mm", label: "Millimeter (mm)", labelHe: "מילימטר (mm)", toBase: 0.001 },
      { id: "um", label: "Micrometer (μm)", labelHe: "מיקרומטר (μm)", toBase: 1e-6 },
      { id: "in", label: "Inch (in)", labelHe: "אינץ' (in)", toBase: 0.0254 },
      { id: "ft", label: "Foot (ft)", labelHe: "רגל (ft)", toBase: 0.3048 },
      { id: "mi", label: "Mile (mi)", labelHe: "מייל (mi)", toBase: 1609.344 },
    ],
  },
  {
    name: "Mass", nameHe: "מסה", icon: "fitness_center",
    units: [
      { id: "kg", label: "Kilogram (kg)", labelHe: "קילוגרם (kg)", toBase: 1 },
      { id: "g", label: "Gram (g)", labelHe: "גרם (g)", toBase: 0.001 },
      { id: "mg", label: "Milligram (mg)", labelHe: "מיליגרם (mg)", toBase: 1e-6 },
      { id: "lb", label: "Pound (lb)", labelHe: "ליברה (lb)", toBase: 0.453592 },
      { id: "oz", label: "Ounce (oz)", labelHe: "אונקיה (oz)", toBase: 0.0283495 },
      { id: "ton", label: "Metric Ton (t)", labelHe: "טון מטרי (t)", toBase: 1000 },
    ],
  },
  {
    name: "Force", nameHe: "כוח", icon: "bolt",
    units: [
      { id: "N", label: "Newton (N)", labelHe: "ניוטון (N)", toBase: 1 },
      { id: "kN", label: "Kilonewton (kN)", labelHe: "קילוניוטון (kN)", toBase: 1000 },
      { id: "dyn", label: "Dyne (dyn)", labelHe: "דיין (dyn)", toBase: 1e-5 },
      { id: "lbf", label: "Pound-force (lbf)", labelHe: "ליברת כוח (lbf)", toBase: 4.44822 },
      { id: "kgf", label: "Kilogram-force (kgf)", labelHe: "קילוגרם-כוח (kgf)", toBase: 9.80665 },
    ],
  },
  {
    name: "Energy", nameHe: "אנרגיה", icon: "electric_bolt",
    units: [
      { id: "J", label: "Joule (J)", labelHe: "ג'אול (J)", toBase: 1 },
      { id: "kJ", label: "Kilojoule (kJ)", labelHe: "קילוג'אול (kJ)", toBase: 1000 },
      { id: "cal", label: "Calorie (cal)", labelHe: "קלוריה (cal)", toBase: 4.184 },
      { id: "kcal", label: "Kilocalorie (kcal)", labelHe: "קילוקלוריה (kcal)", toBase: 4184 },
      { id: "eV", label: "Electron Volt (eV)", labelHe: "אלקטרון-וולט (eV)", toBase: 1.602e-19 },
      { id: "kWh", label: "Kilowatt-hour (kWh)", labelHe: "קילוואט-שעה (kWh)", toBase: 3.6e6 },
      { id: "BTU", label: "BTU", labelHe: "BTU", toBase: 1055.06 },
    ],
  },
  {
    name: "Power", nameHe: "הספק", icon: "power",
    units: [
      { id: "W", label: "Watt (W)", labelHe: "ואט (W)", toBase: 1 },
      { id: "kW", label: "Kilowatt (kW)", labelHe: "קילוואט (kW)", toBase: 1000 },
      { id: "MW", label: "Megawatt (MW)", labelHe: "מגהוואט (MW)", toBase: 1e6 },
      { id: "hp", label: "Horsepower (hp)", labelHe: "כוח סוס (hp)", toBase: 745.7 },
      { id: "BTU/h", label: "BTU/hr", labelHe: "BTU/שעה", toBase: 0.29307 },
    ],
  },
  {
    name: "Pressure", nameHe: "לחץ", icon: "compress",
    units: [
      { id: "Pa", label: "Pascal (Pa)", labelHe: "פסקל (Pa)", toBase: 1 },
      { id: "kPa", label: "Kilopascal (kPa)", labelHe: "קילופסקל (kPa)", toBase: 1000 },
      { id: "MPa", label: "Megapascal (MPa)", labelHe: "מגהפסקל (MPa)", toBase: 1e6 },
      { id: "atm", label: "Atmosphere (atm)", labelHe: "אטמוספירה (atm)", toBase: 101325 },
      { id: "bar", label: "Bar", labelHe: "בר", toBase: 1e5 },
      { id: "psi", label: "PSI", labelHe: "PSI", toBase: 6894.76 },
      { id: "mmHg", label: "mmHg (Torr)", labelHe: "מ\"מ כספית (Torr)", toBase: 133.322 },
    ],
  },
  {
    name: "Temperature", nameHe: "טמפרטורה", icon: "thermostat",
    units: [
      { id: "C", label: "Celsius (°C)", labelHe: "צלזיוס (°C)", toBase: 1 },
      { id: "K", label: "Kelvin (K)", labelHe: "קלווין (K)", toBase: 1, offset: -273.15 },
      { id: "F", label: "Fahrenheit (°F)", labelHe: "פרנהייט (°F)", toBase: 5 / 9, offset: -32 },
    ],
  },
  {
    name: "Electric", nameHe: "חשמל", icon: "electrical_services",
    units: [
      { id: "V", label: "Volt (V)", labelHe: "וולט (V)", toBase: 1 },
      { id: "mV", label: "Millivolt (mV)", labelHe: "מיליוולט (mV)", toBase: 0.001 },
      { id: "kV", label: "Kilovolt (kV)", labelHe: "קילוולט (kV)", toBase: 1000 },
    ],
  },
];

export default function UnitConverter({ lang }: Props) {
  const isRtl = lang === "he";
  const [catIdx, setCatIdx] = useState(0);
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [inputVal, setInputVal] = useState("1");

  const cat = CATEGORIES[catIdx];
  const from = cat.units[fromIdx] || cat.units[0];
  const to = cat.units[toIdx] || cat.units[1];
  const val = parseFloat(inputVal) || 0;

  // Conversion logic
  let result: number;
  if (cat.name === "Temperature") {
    // Temperature needs special handling
    let celsius: number;
    if (from.id === "C") celsius = val;
    else if (from.id === "K") celsius = val - 273.15;
    else celsius = (val - 32) * (5 / 9); // F

    if (to.id === "C") result = celsius;
    else if (to.id === "K") result = celsius + 273.15;
    else result = celsius * (9 / 5) + 32; // F
  } else {
    const baseVal = val * from.toBase;
    result = baseVal / to.toBase;
  }

  const handleCategoryChange = (idx: number) => {
    setCatIdx(idx);
    setFromIdx(0);
    setToIdx(Math.min(1, CATEGORIES[idx].units.length - 1));
  };

  const swap = () => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
    setInputVal(fmtResult(result));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <span className="material-symbols-outlined">straighten</span>
        </div>
        <h2 className="note-title text-xl font-bold text-on-surface">
          {isRtl ? "ממיר יחידות" : "Unit Converter"}
        </h2>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.name}
            onClick={() => handleCategoryChange(i)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              catIdx === i ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{c.icon}</span>
            {isRtl ? c.nameHe : c.name}
          </button>
        ))}
      </div>

      {/* Converter */}
      <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* From */}
          <div className="flex-1 w-full space-y-2">
            <select
              value={fromIdx}
              onChange={(e) => setFromIdx(parseInt(e.target.value))}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              {cat.units.map((u, i) => (
                <option key={u.id} value={i}>{isRtl ? u.labelHe : u.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full rounded-xl border-2 border-primary/30 bg-surface-container-lowest px-4 py-3 text-xl font-mono font-bold text-on-surface focus:border-primary focus:outline-none text-center"
            />
          </div>

          {/* Swap button */}
          <button
            onClick={swap}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container hover:bg-primary-container/80 active:scale-90 transition-all shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>

          {/* To */}
          <div className="flex-1 w-full space-y-2">
            <select
              value={toIdx}
              onChange={(e) => setToIdx(parseInt(e.target.value))}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              {cat.units.map((u, i) => (
                <option key={u.id} value={i}>{isRtl ? u.labelHe : u.label}</option>
              ))}
            </select>
            <div className="w-full rounded-xl border-2 border-emerald-300/60 bg-emerald-50/40 px-4 py-3 text-xl font-mono font-bold text-emerald-800 text-center min-h-[52px]">
              {fmtResult(result)}
            </div>
          </div>
        </div>

        {/* Formula */}
        <div className="mt-4 text-center text-xs text-on-surface-variant font-mono">
          1 {from.id} = {fmtResult(from.toBase / to.toBase)} {to.id}
          {cat.name === "Temperature" && <span className="ml-2 text-outline">(special conversion)</span>}
        </div>
      </div>
    </div>
  );
}

function fmtResult(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)) return n.toExponential(4);
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toPrecision(6).replace(/0+$/, "").replace(/\.$/, "");
}
