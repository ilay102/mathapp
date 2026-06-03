"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPage, getPages, updateNotebook } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
import { loadLang, type Lang } from "@/lib/i18n";
import NotebookSection from "@/components/NotebookSection";
import FormulaSheet from "@/components/FormulaSheet";

type Props = {
  notebook: DbNotebook;
  pages: DbPage[];
};

/**
 * Continuous-paper notebook view.
 *
 * One scrollable sheet of paper holds every problem in the notebook, stacked
 * vertically. Students can keep working — finish one, scroll down, start the
 * next. "+ Add another problem" appends a new section to the same sheet.
 *
 * Layout:
 *   - Left aside: jump list of problems (click → scroll to that section)
 *   - Top: sticky frosted-glass strip with notebook title, formulas, "+ Add"
 *   - Main: full-bleed ruled paper, sections inside a max-w-5xl column
 */
export default function NotebookView({ notebook, pages: initialPages }: Props) {
  const [pages, setPages] = useState<DbPage[]>(initialPages);
  const [creating, setCreating] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notebook.title);
  const [formulaOpen, setFormulaOpen] = useState(false);

  useEffect(() => {
    setLang(loadLang());
  }, []);

  const refreshPages = useCallback(async () => {
    try {
      const pgs = await getPages(notebook.id);
      setPages(pgs);
    } catch (e) {
      console.error(e);
    }
  }, [notebook.id]);

  const handleRename = useCallback(async () => {
    if (!editedTitle.trim() || editedTitle === notebook.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateNotebook(notebook.id, editedTitle.trim());
      window.dispatchEvent(new Event("reloadNotebooks"));
      setIsEditingTitle(false);
    } catch (e) {
      console.error(e);
    }
  }, [editedTitle, notebook.id, notebook.title]);

  const handleAddProblem = useCallback(async () => {
    setCreating(true);
    try {
      const newPg = await createPage(notebook.id, "", null, [
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
      await refreshPages();
      // Smooth scroll to the new section
      requestAnimationFrame(() => {
        document
          .getElementById(`problem-${newPg.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }, [notebook.id, refreshPages]);

  // Ctrl+N to add a new problem
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "n") {
        e.preventDefault();
        handleAddProblem();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAddProblem]);

  // Toggle-formulas event from sidebar/header
  useEffect(() => {
    const handler = () => setFormulaOpen((p) => !p);
    document.addEventListener("toggle-formulas", handler);
    return () => document.removeEventListener("toggle-formulas", handler);
  }, []);

  const handleInsertFormula = (latex: string) => {
    if (typeof window !== "undefined" && (window as unknown as { insertMathCallback?: (s: string) => void }).insertMathCallback) {
      (window as unknown as { insertMathCallback: (s: string) => void }).insertMathCallback(latex);
    }
  };

  const isRtl = lang === "he";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Left jump-list */}
      <aside className="hidden lg:flex w-72 flex-col bg-surface-container-lowest border-r border-outline-variant/30 shrink-0 h-full overflow-hidden select-none">
        <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between gap-3">
          <Link
            href="/notebooks"
            className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors min-w-0"
          >
            <span className="material-symbols-outlined text-sm font-bold">
              {isRtl ? "arrow_forward" : "arrow_back"}
            </span>
            <span className="truncate">{isRtl ? "כל המחברות" : "All notebooks"}</span>
          </Link>
          <button
            onClick={handleAddProblem}
            disabled={creating}
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50"
            title={isRtl ? "תרגיל חדש" : "New problem"}
          >
            <span className="material-symbols-outlined text-sm font-extrabold">add</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {pages.length === 0 ? (
            <div className="text-center text-xs text-on-surface-variant/70 py-6 font-medium">
              {isRtl ? "אין עדיין תרגילים" : "No problems yet"}
            </div>
          ) : (
            pages.map((p, idx) => {
              const strokes = p.strokes as { parts?: { lastResult?: { status?: string } | null }[] } | null;
              let dot = "bg-neutral-300";
              if (strokes?.parts?.some((pt) => pt.lastResult?.status === "wrong")) dot = "bg-error";
              else if (strokes?.parts?.some((pt) => pt.lastResult?.status === "incomplete")) dot = "bg-amber-500";
              else if (strokes?.parts?.some((pt) => pt.lastResult?.status === "correct")) dot = "bg-emerald-500";

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    document
                      .getElementById(`problem-${p.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="w-full text-left rounded-lg p-2.5 border border-outline-variant/20 hover:bg-surface-container-low/60 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                      {isRtl ? `תרגיל ${idx + 1}` : `Problem ${idx + 1}`}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                  </div>
                  <p className="text-xs font-semibold text-on-surface truncate" dir="auto">
                    {p.problem.trim() || (isRtl ? "(ללא כותרת)" : "(Untitled)")}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main paper pane */}
      <main className="notebook-paper-bleed flex-1 overflow-y-auto h-full relative select-text">
        {/* Sticky glass header */}
        <header className="tool-glass sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-8 py-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="flex-1 max-w-md rounded-lg border border-primary bg-surface-container-low px-3 py-1.5 text-base font-bold text-on-surface focus:outline-none"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-2 group min-w-0"
              >
                <h1 className="note-title text-xl sm:text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors truncate">
                  {notebook.title}
                </h1>
                <span className="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 transition-opacity text-base">
                  edit
                </span>
              </button>
            )}
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-outline">
              {pages.length} {isRtl ? "תרגילים" : "problems"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFormulaOpen((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              <span className="hidden sm:inline">{isRtl ? "נוסחאות" : "Formulas"}</span>
            </button>
            <button
              onClick={handleAddProblem}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              <span className="hidden sm:inline">{isRtl ? "תרגיל חדש" : "New problem"}</span>
              <span className="sm:hidden">{isRtl ? "חדש" : "New"}</span>
            </button>
          </div>
        </header>

        {/* The paper itself */}
        <div className="max-w-5xl mx-auto px-4 sm:px-12 py-8 sm:py-12">
          {pages.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container/60 text-on-surface-variant mx-auto">
                <span className="material-symbols-outlined text-4xl">draw</span>
              </div>
              <p className="text-sm font-semibold text-on-surface-variant">
                {isRtl
                  ? "המחברת ריקה. הוסף את התרגיל הראשון שלך כדי להתחיל."
                  : "This notebook is empty. Add your first problem to get started."}
              </p>
              <button
                onClick={handleAddProblem}
                disabled={creating}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>{isRtl ? "התחל תרגיל ראשון" : "Start first problem"}</span>
              </button>
            </div>
          ) : (
            <>
              {pages.map((p, i) => (
                <NotebookSection
                  key={p.id}
                  page={p}
                  index={i}
                  lang={lang}
                  onDeleted={refreshPages}
                />
              ))}

              {/* Add-another-problem pill at the bottom of the paper */}
              <div className="flex justify-center pt-8 pb-12">
                <button
                  onClick={handleAddProblem}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-primary/40 bg-surface-container-lowest/60 px-7 py-3.5 text-sm font-bold text-primary hover:bg-primary/5 hover:border-primary hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>{isRtl ? "הוסף תרגיל נוסף" : "Add another problem"}</span>
                  <span className="text-[10px] font-mono text-outline/60 hidden sm:inline">Ctrl+N</span>
                </button>
              </div>
            </>
          )}
        </div>

        <FormulaSheet
          isOpen={formulaOpen}
          onClose={() => setFormulaOpen(false)}
          onInsertFormula={handleInsertFormula}
        />
      </main>
    </div>
  );
}
