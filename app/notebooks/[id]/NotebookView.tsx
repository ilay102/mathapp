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
      // Refresh sidebar list
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
      className="mx-auto max-w-4xl p-5 sm:p-8 space-y-6 min-h-screen pb-24"
    >
      {/* Back navigation */}
      <Link
        href="/notebooks"
        className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors font-medium"
      >
        <span className="material-symbols-outlined text-sm">
          {isRtl ? "arrow_forward" : "arrow_back"}
        </span>
        <span>{isRtl ? "כל המחברות" : "All Notebooks"}</span>
      </Link>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-2xl font-bold text-on-surface focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                onClick={handleRename}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
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
          <p className="text-xs text-on-surface-variant mt-1.5">
            {isRtl
              ? `עודכן לאחרונה: ${new Date(notebook.updated_at).toLocaleDateString()}`
              : `Last updated: ${new Date(notebook.updated_at).toLocaleDateString()}`}
          </p>
        </div>

        <button
          onClick={newPage}
          disabled={creating}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-colors inline-flex items-center gap-1 shrink-0 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>{isRtl ? "תרגיל חדש" : "New Problem"}</span>
        </button>
      </header>

      {/* Statistics dashboard */}
      {totalPages > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              {isRtl ? "סה\"כ דפים" : "Total pages"}
            </span>
            <div className="text-2xl font-bold text-on-surface mt-1">{totalPages}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/40 bg-green-500/5 p-4 border-green-500/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
              {isRtl ? "תקינים (100%)" : "Correct"}
            </span>
            <div className="text-2xl font-bold text-green-700 mt-1">{correctPages}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/40 bg-error/5 p-4 border-error/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-error">
              {isRtl ? "שגויים" : "With mistakes"}
            </span>
            <div className="text-2xl font-bold text-error mt-1">{mistakePages}</div>
          </div>
          <div className="rounded-2xl border border-outline-variant/40 bg-amber-500/5 p-4 border-amber-500/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
              {isRtl ? "בתהליך" : "In progress"}
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">{inProgressPages}</div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2 max-w-md shadow-inner">
          <span className="material-symbols-outlined text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "חפש תרגיל..." : "Filter problems..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
      )}

      {/* Pages list */}
      {totalPages === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-outline">description</span>
          <p className="mt-3 text-sm text-on-surface-variant">
            {isRtl ? "אין עדיין דפים במחברת זו." : "There are no pages in this notebook yet."}
          </p>
          <button
            onClick={newPage}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/95 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            {isRtl ? "צור דף ראשון" : "Create first page"}
          </button>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center text-sm text-on-surface-variant py-8">
          {isRtl ? "לא נמצאו תרגילים מתאימים." : "No problems matched your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredPages.map((p, idx) => {
            const status = pageStatuses[pages.indexOf(p)];

            let badgeBg = "bg-neutral-100 text-neutral-600";
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
                className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 sm:p-5 hover:border-primary hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-secondary-container text-on-secondary-container px-2.5 py-0.5 text-[10px] font-bold">
                      {isRtl ? `תרגיל ${idx + 1}` : `Problem ${idx + 1}`}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeBg}`}>
                      {badgeText}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-on-surface truncate pr-4" dir="auto">
                    {p.problem.trim() || (isRtl ? "(תרגיל ללא כותרת)" : "(Untitled problem)")}
                  </h3>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-outline-variant/10 pt-2 sm:pt-0">
                  <span className="text-[10px] text-outline">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-lg">
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
