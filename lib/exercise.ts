import type { Stroke } from "@/lib/strokes";
import type { CheckResultData } from "@/components/CheckResult";

export type Part = {
  id: string;
  /** Label shown beside the part, e.g. "a", "b", "1". Empty for single-part exercises. */
  label: string;
  /** Optional sub-question text — e.g. "Find f'(π/2) using the result from (a)". */
  subPrompt: string;
  linesText: string;
  lastResult?: CheckResultData | null;
  lastGradedLines?: string[];
  strokes?: Stroke[] | null;
};

export type Exercise = {
  id: string;
  problemText: string;
  problemImage?: string | null;
  parts: Part[];
  createdAt: number;

  // ---- LEGACY single-part fields (still read on load for migration) ----
  linesText?: string;
  lastResult?: CheckResultData | null;
  lastGradedLines?: string[];
};

const STORAGE_KEY = "mathpad.exercises.v1";

export function newPart(label = ""): Part {
  return {
    id: Math.random().toString(36).slice(2, 10),
    label,
    subPrompt: "",
    linesText: "",
    lastResult: null,
    lastGradedLines: [],
    strokes: null,
  };
}

export function newExercise(seed?: Partial<Exercise> & { linesText?: string }): Exercise {
  return {
    id: Math.random().toString(36).slice(2, 10),
    problemText: seed?.problemText ?? "",
    problemImage: seed?.problemImage ?? null,
    parts: seed?.parts ?? [
      {
        id: Math.random().toString(36).slice(2, 10),
        label: "",
        subPrompt: "",
        linesText: seed?.linesText ?? "",
        lastResult: null,
        lastGradedLines: [],
      },
    ],
    createdAt: Date.now(),
  };
}

function migrateExercise(raw: Exercise): Exercise {
  if (raw.parts && raw.parts.length > 0) return raw;
  // Legacy single-part exercise → wrap it.
  return {
    id: raw.id,
    problemText: raw.problemText,
    problemImage: raw.problemImage ?? null,
    createdAt: raw.createdAt,
    parts: [
      {
        id: Math.random().toString(36).slice(2, 10),
        label: "",
        subPrompt: "",
        linesText: raw.linesText ?? "",
        lastResult: raw.lastResult ?? null,
        lastGradedLines: raw.lastGradedLines ?? [],
      },
    ],
  };
}

export function loadExercises(): Exercise[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Exercise[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateExercise);
  } catch {
    return [];
  }
}

export function saveExercises(list: Exercise[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / serialization */
  }
}

/** Default labels for newly-added parts: a, b, c, … then 2, 3, … if we run out. */
export function nextLabel(existing: Part[]): string {
  const used = new Set(existing.map((p) => p.label).filter(Boolean));
  for (const letter of "abcdefghijklmnop") if (!used.has(letter)) return letter;
  for (let i = 1; i < 100; i++) if (!used.has(String(i))) return String(i);
  return "";
}
