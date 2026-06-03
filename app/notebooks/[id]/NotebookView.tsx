"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPage, updateNotebook } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
import { loadLang, type Lang } from "@/lib/i18n";

type Props = {
  notebook: DbNotebook;
  pages: DbPage[];
};

export default function NotebookView({ notebook, pages }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(notebook.title);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLang(loadLang());
  }, []);

  async function handleRename() {
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
  }

  async function newPage() {
    setCreating(true);
    try {
      const page = await createPage(notebook.id, "", null, [
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
      router.push(`/notebooks/${notebook.id}/${page.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  const isRtl = lang === "he";

  // Calculate stats
  const pageStatuses = pages.map((p) => {
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
  });

  const totalPages = pages.length;
  const correctPages = pageStatuses.filter((s) => s === "correct").length;
  const mistakePages = pageStatuses.filter((s) => s === "mistake").length;
  const inProgressPages = pageStatuses.filter(
    (s) => s === "in-progress" || s === "incomplete"
  ).length;

  const filteredPages = pages.filter((p) =>
    p.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-5xl p-6 sm:p-10 space-y-6 min-h-screen pb-24 animate-fade-in"
    >
      {/* Back navigation */}
      <Link
        href="/notebooks"
        className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors font-bold"
      >
        <span className="material-symbols-outlined text-sm font-bold">
          {isRtl ? "arrow_forward" : "arrow_back"}
        </span>
        <span>{isRtl ? "כל המחברות" : "All Notebooks"}</span>
      </Link>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/20">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="w-full rounded-xl border-2 border-primary bg-surface-container-low px-4 py-2 text-2xl font-bold text-on-surface focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary/95 transition-colors shrink-0"
              >
                {isRtl ? "שמור" : "Save"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              <h1 className="note-title text-3xl font-extrabold text-on-surface hover:text-primary transition-colors">
                {notebook.title}
              </h1>
              <span className="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                edit
              </span>
            </div>
          )}
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1.5">
            {isRtl
              ? `עודכן לאחרונה: ${new Date(notebook.updated_at).toLocaleDateString()}`
              : `Last updated: ${new Date(notebook.updated_at).toLocaleDateString()}`}
          </p>
        </div>

        <button
          onClick={newPage}
          disabled={creating}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shrink-0 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>{isRtl ? "תרגיל חדש" : "New Problem"}</span>
        </button>
      </header>

      {/* Statistics dashboard */}
      {totalPages > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-4 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-outline">
              {isRtl ? "סה\"כ דפים" : "Total pages"}
            </span>
            <div className="text-3xl font-black text-on-surface mt-1">{totalPages}</div>
          </div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.03] p-4 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-green-700">
              {isRtl ? "תקינים" : "Correct"}
            </span>
            <div className="text-3xl font-black text-green-700 mt-1">{correctPages}</div>
          </div>
          <div className="rounded-2xl border border-error/25 bg-error/[0.03] p-4 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-error">
              {isRtl ? "שגויים" : "With mistakes"}
            </span>
            <div className="text-3xl font-black text-error mt-1">{mistakePages}</div>
          </div>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] p-4 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">
              {isRtl ? "בתהליך" : "In progress"}
            </span>
            <div className="text-3xl font-black text-amber-700 mt-1">{inProgressPages}</div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2.5 max-w-md shadow-inner">
          <span className="material-symbols-outlined text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "חפש תרגיל..." : "Filter problems by query..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
      )}

      {/* Pages list */}
      {totalPages === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-10 text-center space-y-4 max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant mx-auto">
            <span className="material-symbols-outlined text-3xl">description</span>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant leading-relaxed">
            {isRtl ? "אין עדיין דפים במחברת זו." : "There are no pages in this notebook yet."}
          </p>
          <button
            onClick={newPage}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            {isRtl ? "צור דף ראשון" : "Create first page"}
          </button>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center text-sm text-on-surface-variant py-8 font-medium">
          {isRtl ? "לא נמצאו תרגילים מתאימים." : "No problems matched your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPages.map((p, idx) => {
            const status = pageStatuses[pages.indexOf(p)];

            let badgeBg = "bg-neutral-100 text-neutral-600 border border-outline-variant/20";
            let badgeText = isRtl ? "לא נבדק" : "Unchecked";

            if (status === "correct") {
              badgeBg = "bg-green-100 text-green-700 border border-green-200";
              badgeText = isRtl ? "תקין" : "Correct";
            } else if (status === "mistake") {
              badgeBg = "bg-red-100 text-red-700 border border-red-200";
              badgeText = isRtl ? "טעות נמצאה" : "Mistake";
            } else if (status === "incomplete" || status === "in-progress") {
              badgeBg = "bg-amber-100 text-amber-700 border border-amber-200";
              badgeText = isRtl ? "בתהליך" : "In Progress";
            }

            return (
              <Link
                key={p.id}
                href={`/notebooks/${notebook.id}/${p.id}`}
                className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 hover:border-primary hover:shadow-md hover:scale-[1.01] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-lg bg-secondary-container/15 text-secondary px-2.5 py-0.5 text-[9px] font-bold border border-secondary/20 uppercase tracking-wider">
                      {isRtl ? `תרגיל ${idx + 1}` : `Problem ${idx + 1}`}
                    </span>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeBg}`}>
                      {badgeText}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate pr-4" dir="auto">
                    {p.problem.trim() || (isRtl ? "(תרגיל ללא כותרת)" : "(Untitled problem)")}
                  </h3>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-outline-variant/10 pt-2.5 sm:pt-0">
                  <span className="text-[10px] font-bold text-outline">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-lg font-bold">
                    {isRtl ? "arrow_back" : "arrow_forward"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
