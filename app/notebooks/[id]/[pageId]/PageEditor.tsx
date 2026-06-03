"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ExerciseCard from "@/components/ExerciseCard";
import FormulaSheet from "@/components/FormulaSheet";
import { updatePage, deletePage, getPages, getNotebooks, createPage } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
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

  // Unified Notebook Workspace Lists (Apple Notes split-pane)
  const [notebook, setNotebook] = useState<DbNotebook | null>(null);
  const [notebookPages, setNotebookPages] = useState<DbPage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize unified multi-part Exercise object from db page
  const initialExercise = useMemo(() => {
    let parts: Part[] = [];
    let problemImage: string | null = null;

    if (page.strokes) {
      if (Array.isArray(page.strokes)) {
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
    
    // Load notebook details
    getNotebooks().then((list) => {
      const nb = list.find((n) => n.id === notebookId);
      if (nb) setNotebook(nb);
    });

    // Load list of all pages in this notebook
    getPages(notebookId).then((pgs) => {
      setNotebookPages(pgs);
    });
  }, [notebookId]);

  useEffect(() => {
    const handleToggle = () => {
      setFormulaOpen((prev) => !prev);
    };
    document.addEventListener("toggle-formulas", handleToggle);
    return () => {
      document.removeEventListener("toggle-formulas", handleToggle);
    };
  }, []);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "n") {
        e.preventDefault();
        handleCreatePage();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [notebookId, lang, notebookPages]);

  // Sync state with incoming page parameters (in case user switches pages via sidebar)
  useEffect(() => {
    setExercise(initialExercise);
  }, [page, initialExercise]);

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
        
        // Refresh local pages list so titles update in sidebar
        const pgs = await getPages(notebookId);
        setNotebookPages(pgs);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 800);
    return () => clearTimeout(t);
  }, [exercise, notebookId]);

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

  const handleCreatePage = async () => {
    try {
      const newPg = await createPage(notebookId, "", null, [
        {
          id: Math.random().toString(36).slice(2, 10),
          label: "",
          subPrompt: "",
          linesText: "",
          lastResult: null,
          lastGradedLines: [],
          strokes: null,
        },
      ]);
      router.push(`/notebooks/${notebookId}/${newPg.id}`);
      const pgs = await getPages(notebookId);
      setNotebookPages(pgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const getPageStatus = (p: DbPage) => {
    const strokesData = p.strokes;
    if (!strokesData || !strokesData.parts || strokesData.parts.length === 0) {
      return "unchecked";
    }
    const parts = strokesData.parts;
    let hasMistake = false;
    let hasIncomplete = false;
    let hasCorrect = false;
    let hasUnchecked = false;

    for (const part of parts) {
      const r = part.lastResult;
      if (!r) {
        hasUnchecked = true;
      } else if (r.status === "wrong") {
        hasMistake = true;
      } else if (r.status === "incomplete") {
        hasIncomplete = true;
      } else if (r.status === "correct") {
        hasCorrect = true;
      }
    }

    if (hasMistake) return "mistake";
    if (hasIncomplete) return "incomplete";
    if (hasUnchecked) return "in-progress";
    if (hasCorrect) return "correct";
    return "unchecked";
  };

  const isRtl = lang === "he";

  const filteredPages = notebookPages.filter((p) =>
    p.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="flex h-screen overflow-hidden bg-neutral-100">
      {/* 2-PANE WORKSPACE: LEFT COLUMN PROBLEMS LIST (Desktop Apple Notes Sidebar style) */}
      <aside className="hidden lg:flex w-80 flex-col bg-surface-container-lowest border-r border-outline-variant/30 shrink-0 h-full overflow-hidden select-none">
        {/* Course Header */}
        <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between gap-3 bg-surface-container-low/30">
          <Link
            href={`/notebooks/${notebookId}`}
            className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {isRtl ? "arrow_forward" : "arrow_back"}
            </span>
            <span className="truncate max-w-[120px]">{notebook?.title || (isRtl ? "מחברת" : "Notebook")}</span>
          </Link>
          <button
            onClick={handleCreatePage}
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all hover:scale-105"
            title={isRtl ? "תרגיל חדש" : "New Problem"}
          >
            <span className="material-symbols-outlined text-sm font-extrabold">add</span>
          </button>
        </div>

        {/* Search Problems */}
        <div className="p-3 border-b border-outline-variant/10">
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 shadow-inner">
            <span className="material-symbols-outlined text-outline text-base">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? "חפש תרגיל..." : "Filter problems..."}
              className="w-full bg-transparent text-xs text-on-surface focus:outline-none placeholder:text-outline"
            />
          </div>
        </div>

        {/* Problems List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPages.length === 0 ? (
            <div className="text-center text-xs text-on-surface-variant/70 py-6 font-medium">
              {isRtl ? "לא נמצאו תרגילים" : "No problems found"}
            </div>
          ) : (
            filteredPages.map((p, idx) => {
              const isActive = p.id === page.id;
              const status = getPageStatus(p);

              let badgeBg = "bg-neutral-100 text-neutral-600 border border-outline-variant/20";
              let badgeText = isRtl ? "לא נבדק" : "Unchecked";

              if (status === "correct") {
                badgeBg = "bg-green-100 text-green-700 border border-green-200";
                badgeText = isRtl ? "תקין" : "Correct";
              } else if (status === "mistake") {
                badgeBg = "bg-red-100 text-red-700 border border-red-200";
                badgeText = isRtl ? "טעות" : "Mistake";
              } else if (status === "incomplete" || status === "in-progress") {
                badgeBg = "bg-amber-100 text-amber-700 border border-amber-200";
                badgeText = isRtl ? "בתהליך" : "In Progress";
              }

              return (
                <Link
                  key={p.id}
                  href={`/notebooks/${notebookId}/${p.id}`}
                  className={`block rounded-2xl p-4 border transition-all hover:scale-[1.01] ${
                    isActive
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-surface-container-low/20 border-outline-variant/20 hover:bg-surface-container-low/50"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[8px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${
                        isActive ? "bg-primary text-white" : "bg-secondary-container/10 text-secondary border border-secondary/20"
                      }`}>
                        {isRtl ? `תרגיל ${idx + 1}` : `Problem ${idx + 1}`}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${badgeBg}`}>
                        {badgeText}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-on-surface truncate" dir="auto">
                      {p.problem.trim() || (isRtl ? "(תרגיל ללא כותרת)" : "(Untitled problem)")}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* 2-PANE WORKSPACE: RIGHT COLUMN — the paper itself */}
      <main className="notebook-paper-bleed flex-1 overflow-y-auto h-full flex flex-col relative select-text">
        {/* Floating top header — glass strip pinned to top of paper */}
        <header className="tool-glass sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/notebooks/${notebookId}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm font-bold">
                {isRtl ? "arrow_forward" : "arrow_back"}
              </span>
              <span>{isRtl ? "חזרה למחברת" : "Back to Notebook"}</span>
            </Link>
            <span className="h-4 w-px bg-outline-variant" />
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider min-w-[50px]">
              {saving === "saving"
                ? (isRtl ? "שומר..." : "saving...")
                : saving === "saved"
                ? (isRtl ? "נשמר" : "saved")
                : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Formula sheet trigger */}
            <button
              onClick={() => setFormulaOpen(!formulaOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">menu_book</span>
              <span>{isRtl ? "נוסחאות" : "Formulas"}</span>
            </button>

            {/* Delete Page */}
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-4 py-2 text-xs font-bold text-error hover:bg-error/10 transition-colors"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span>{isRtl ? "מחק דף" : "Delete Page"}</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-error/20 bg-error/5 p-3.5 text-xs text-error font-medium mb-4 shrink-0">
            {error}
          </div>
        )}

        {/* The page itself — no card, no border. ExerciseCard is now chrome-less. */}
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-12 py-6 sm:py-10">
          <ExerciseCard
            exercise={exercise}
            index={0}
            lang={lang}
            onChange={setExercise}
            onRemove={handleDelete}
          />

          {/* Page-turn footer — sits at the bottom of the paper like the corner of a real notebook page */}
          {(() => {
            const idx = notebookPages.findIndex((p) => p.id === page.id);
            const prev = idx > 0 ? notebookPages[idx - 1] : null;
            const next = idx >= 0 && idx < notebookPages.length - 1 ? notebookPages[idx + 1] : null;
            return (
              <div className="mt-10 mb-4 flex items-center justify-between gap-3 border-t border-dashed border-outline-variant/40 pt-5">
                <div className="flex-1">
                  {prev && (
                    <button
                      onClick={() => router.push(`/notebooks/${notebookId}/${prev.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low/80 backdrop-blur px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">{isRtl ? "arrow_forward" : "arrow_back"}</span>
                      <span className="max-w-[160px] truncate">
                        {prev.problem.trim() || (isRtl ? "תרגיל קודם" : "Previous problem")}
                      </span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline/70">
                  {idx >= 0 ? `${idx + 1} / ${notebookPages.length}` : ""}
                </span>
                <div className="flex-1 flex justify-end">
                  {next ? (
                    <button
                      onClick={() => router.push(`/notebooks/${notebookId}/${next.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low/80 backdrop-blur px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors shadow-sm"
                    >
                      <span className="max-w-[160px] truncate">
                        {next.problem.trim() || (isRtl ? "תרגיל הבא" : "Next problem")}
                      </span>
                      <span className="material-symbols-outlined text-base">{isRtl ? "arrow_back" : "arrow_forward"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCreatePage}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary text-on-primary px-5 py-2.5 text-xs font-bold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>{isRtl ? "דף חדש" : "New page"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Formula Sheet Slide-over Panel */}
        <FormulaSheet
          isOpen={formulaOpen}
          onClose={() => setFormulaOpen(false)}
          onInsertFormula={handleInsertFormula}
        />
      </main>
    </div>
  );
}
