"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseCard from "./ExerciseCard";
import { updatePage, deletePage } from "@/lib/dataService";
import type { DbPage } from "@/lib/dataService";
import type { Exercise, Part } from "@/lib/exercise";
import { type Lang } from "@/lib/i18n";

type Props = {
  page: DbPage;
  index: number;
  lang: Lang;
  onDeleted: () => void;
};

/**
 * A single "problem section" inside the continuous notebook paper.
 * - Initializes an Exercise from the DbPage (matching PageEditor's logic).
 * - Autosaves on edit (800ms debounce) — independent per section.
 * - Renders inline; no border/card, just a problem number tag and the ExerciseCard.
 * - Hover reveals a small delete button.
 */
export default function NotebookSection({ page, index, lang, onDeleted }: Props) {
  const initial = useMemo(() => exerciseFromDbPage(page), [page]);
  const [exercise, setExercise] = useState<Exercise>(initial);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const lastSavedKey = useRef<string>("");

  const isRtl = lang === "he";

  // Resync if the underlying page changes (e.g. user deleted a sibling above).
  useEffect(() => {
    setExercise(exerciseFromDbPage(page));
    lastSavedKey.current = "";
  }, [page.id]);

  // Autosave with debounce
  useEffect(() => {
    const key = JSON.stringify({
      p: exercise.problemText,
      img: exercise.problemImage,
      parts: exercise.parts,
    });
    if (key === lastSavedKey.current) return;

    const t = setTimeout(async () => {
      setSaving("saving");
      try {
        await updatePage(exercise.id, {
          problem: exercise.problemText,
          parts: exercise.parts,
          problemImage: exercise.problemImage,
        });
        lastSavedKey.current = key;
        setSaving("saved");
        // Drop the saved indicator after a moment
        setTimeout(() => setSaving("idle"), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 800);
    return () => clearTimeout(t);
  }, [exercise]);

  async function handleDelete() {
    const msg = isRtl ? "למחוק את התרגיל הזה?" : "Delete this problem?";
    if (!window.confirm(msg)) return;
    try {
      await deletePage(exercise.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section
      id={`problem-${page.id}`}
      className="group/section relative pb-10"
      data-problem-index={index + 1}
    >
      {/* Problem number tag + per-section actions (hover-revealed) */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary-container/30 text-secondary px-2.5 py-1 text-[10px] font-bold border border-secondary/20 uppercase tracking-wider">
            {isRtl ? `תרגיל ${index + 1}` : `Problem ${index + 1}`}
          </span>
          {saving === "saving" && (
            <span className="text-[10px] text-outline font-mono italic">
              {isRtl ? "שומר…" : "saving…"}
            </span>
          )}
          {saving === "saved" && (
            <span className="text-[10px] text-emerald-600 font-mono italic">
              {isRtl ? "נשמר" : "saved"}
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity text-on-surface-variant hover:text-error p-1 rounded-md hover:bg-error/10"
          title={isRtl ? "מחק תרגיל" : "Delete problem"}
        >
          <span className="material-symbols-outlined text-base">delete_outline</span>
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/5 p-2 text-xs text-error mb-2">
          {error}
        </div>
      )}

      {/* The actual problem card — keep mounted; ExerciseCard handles its own chrome */}
      <ExerciseCard
        exercise={exercise}
        index={index}
        lang={lang}
        onChange={setExercise}
        onRemove={handleDelete}
      />

      {/* Section divider */}
      <div className="mt-12 border-t border-dashed border-outline-variant/30" />
    </section>
  );
}

function exerciseFromDbPage(page: DbPage): Exercise {
  let parts: Part[] = [];
  let problemImage: string | null = null;

  const strokes: unknown = page.strokes;
  if (strokes) {
    if (Array.isArray(strokes)) {
      // Legacy: strokes was a flat Stroke[] (pre-multipart schema)
      parts = [
        {
          id: Math.random().toString(36).slice(2, 10),
          label: "",
          subPrompt: "",
          linesText: page.ocr_lines?.join("\n") ?? "",
          lastResult: null,
          lastGradedLines: [],
          strokes: strokes as Part["strokes"],
        },
      ];
    } else if (typeof strokes === "object") {
      const s = strokes as { parts?: Part[]; problemImage?: string | null };
      parts = s.parts ?? [];
      problemImage = s.problemImage ?? null;
    }
  }

  if (parts.length === 0) {
    parts = [
      {
        id: Math.random().toString(36).slice(2, 10),
        label: "",
        subPrompt: "",
        linesText: "",
        lastResult: null,
        lastGradedLines: [],
        strokes: null,
      },
    ];
  }

  return {
    id: page.id,
    problemText: page.problem ?? "",
    problemImage,
    parts,
    createdAt: Date.now(),
  };
}
