"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ExerciseCard from "@/components/ExerciseCard";
import FormulaSheet from "@/components/FormulaSheet";
import { updatePage, deletePage } from "@/lib/dataService";
import type { Exercise, Part } from "@/lib/exercise";
import { loadLang, type Lang } from "@/lib/i18n";

type PageData = {
  id: string;
  notebook_id: string;
  problem: string;
  strokes: any;
  ocr_lines: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export default function PageEditor({ page, notebookId }: { page: PageData; notebookId: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Initialize unified multi-part Exercise object from db page
  const initialExercise = useMemo(() => {
    let parts: Part[] = [];
    let problemImage: string | null = null;

    if (page.strokes) {
      if (Array.isArray(page.strokes)) {
        // Legacy single-part drawing array
        parts = [
          {
            id: Math.random().toString(36).slice(2, 10),
            label: "",
            subPrompt: "",
            linesText: page.ocr_lines?.join("\n") ?? "",
            lastResult: null,
            lastGradedLines: [],
            strokes: page.strokes,
          },
        ];
      } else {
        // New multi-part structure
        parts = page.strokes.parts ?? [];
        problemImage = page.strokes.problemImage ?? null;
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
  }, [page]);

  const [exercise, setExercise] = useState<Exercise>(initialExercise);

  useEffect(() => {
    setLang(loadLang());
  }, []);

  // Autosave exercise modifications
  useEffect(() => {
    const t = setTimeout(async () => {
      setSaving("saving");
      try {
        await updatePage(exercise.id, {
          problem: exercise.problemText,
          parts: exercise.parts,
          problemImage: exercise.problemImage,
        });
        setSaving("saved");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 800);
    return () => clearTimeout(t);
  }, [exercise]);

  const handleDelete = async () => {
    const confirmMsg = lang === "he" ? "האם למחוק דף זה?" : "Are you sure you want to delete this page?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await deletePage(exercise.id);
      router.push(`/notebooks/${notebookId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleInsertFormula = (latex: string) => {
    if (typeof window !== "undefined" && (window as any).insertMathCallback) {
      (window as any).insertMathCallback(latex);
    }
  };

  const isRtl = lang === "he";

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6 relative pb-24"
    >
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/notebooks/${notebookId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {isRtl ? "arrow_forward" : "arrow_back"}
            </span>
            <span>{isRtl ? "חזרה למחברת" : "Back to Notebook"}</span>
          </Link>
          <span className="h-4 w-px bg-outline-variant" />
          <span className="text-xs text-outline">
            {saving === "saving"
              ? (isRtl ? "שומר..." : "saving...")
              : saving === "saved"
              ? (isRtl ? "נשמר" : "saved")
              : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Formula sheet drawer trigger */}
          <button
            onClick={() => setFormulaOpen(!formulaOpen)}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">menu_book</span>
            <span>{isRtl ? "נוסחאות" : "Formulas"}</span>
          </button>

          {/* Delete Page */}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-full border border-error/30 bg-error/5 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>{isRtl ? "מחק דף" : "Delete Page"}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-xs text-error">
          {error}
        </div>
      )}

      {/* Main Multi-part Exercise Card */}
      <ExerciseCard
        exercise={exercise}
        index={0}
        lang={lang}
        onChange={setExercise}
        onRemove={handleDelete}
      />

      {/* Formula Sheet Slide-over Panel */}
      <FormulaSheet
        isOpen={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        onInsertFormula={handleInsertFormula}
      />
    </main>
  );
}
