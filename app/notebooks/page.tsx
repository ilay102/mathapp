"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getNotebooks, createNotebook, getSessionUser, deleteNotebook } from "@/lib/dataService";
import type { DbNotebook } from "@/lib/dataService";
import { loadLang, t, type Lang } from "@/lib/i18n";

export default function NotebooksPage() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<DbNotebook[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [isGuest, setIsGuest] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await getSessionUser();
      setIsGuest(!u);
      const list = await getNotebooks();
      setNotebooks(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLang(loadLang());
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Empty input is OK — auto-title so one-click "New Course" Just Works.
    const title = newTitle.trim() || (lang === "he" ? "מחברת חדשה" : "Untitled Course");
    setCreating(true);
    try {
      const nb = await createNotebook(title);
      setNewTitle("");
      window.dispatchEvent(new Event("reloadNotebooks"));
      router.push(`/notebooks/${nb.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmMsg = lang === "he" ? "האם למחוק מחברת זו וכל הדפים בה?" : "Delete this notebook and all its pages?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteNotebook(id);
      window.dispatchEvent(new Event("reloadNotebooks"));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const isRtl = lang === "he";

  const filteredNotebooks = notebooks.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-5xl p-6 sm:p-10 space-y-6 min-h-screen pb-24 animate-fade-in"
    >
      {/* Welcome & Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-5 border-b border-outline-variant/20">
        <div>
          <h1 className="note-title text-3xl font-extrabold text-on-surface">
            {isRtl ? "המחברות שלי" : "My Course Notebooks"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {isRtl
              ? "נהל וסדר את פתרונות התרגילים והמטלות שלך לפי קורסים"
              : "Organize your calculations and homework assignments by course"}
          </p>
        </div>

        {/* Create new course */}
        <form onSubmit={handleCreate} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isRtl ? "שם הקורס (אופציונלי)..." : "Course name (optional)..."}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary flex-1 sm:flex-none"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-1 shrink-0 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>{isRtl ? "קורס חדש" : "New Course"}</span>
          </button>
        </form>
      </header>

      {/* Guest Banner */}
      {isGuest && (
        <div className="rounded-3xl bg-primary-container/20 border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5 animate-pulse">cloud_queue</span>
            <div>
              <h3 className="text-sm font-bold text-on-primary-container">
                {isRtl ? "עבודה במצב אורח (מקומי)" : "Working in Guest Mode"}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed font-medium">
                {isRtl
                  ? "המחברות נשמרות בדפדפן זה בלבד. התחבר כדי לסנכרן לענן ולגשת מכל מכשיר או טאבלט."
                  : "Notebooks are saved locally in this browser. Sign in to back up online and access from iPad/tablet."}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-black px-5 py-2.5 text-center text-xs font-bold text-white hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shrink-0 shadow-sm"
          >
            {isRtl ? "התחבר עכשיו" : "Sign In Now"}
          </Link>
        </div>
      )}

      {/* Search Filter */}
      {notebooks.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2.5 max-w-md shadow-inner">
          <span className="material-symbols-outlined text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "חפש קורס..." : "Filter courses by title..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-36 rounded-3xl bg-surface-container animate-pulse" />
          <div className="h-36 rounded-3xl bg-surface-container animate-pulse" />
        </div>
      ) : filteredNotebooks.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/30 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant mx-auto">
            <span className="material-symbols-outlined text-3xl">folder_open</span>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant leading-relaxed">
            {searchQuery
              ? (isRtl ? "לא נמצאו קורסים מתאימים לחיפוש." : "No courses matching your search.")
              : (isRtl ? "אין לך עדיין מחברות קורסים. צור את הראשונה למעלה!" : "You don't have any course notebooks yet. Create your first above!")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotebooks.map((nb) => (
            <Link
              key={nb.id}
              href={`/notebooks/${nb.id}`}
              className="rounded-3xl border border-outline-variant/50 bg-surface-container-lowest p-6 hover:border-primary hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between group min-h-[160px]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary shadow-inner">
                    <span className="material-symbols-outlined text-xl">folder</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(nb.id, e)}
                    className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-surface-container"
                    title={isRtl ? "מחק קורס" : "Delete course"}
                  >
                    <span className="material-symbols-outlined text-lg">delete_outline</span>
                  </button>
                </div>
                <h3 className="note-title text-2xl font-bold text-on-surface mt-4 truncate">
                  {nb.title}
                </h3>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant/20 mt-5 pt-3.5 text-[9px] font-bold text-outline uppercase tracking-wider">
                <span>{new Date(nb.updated_at).toLocaleDateString()}</span>
                <span className="text-primary group-hover:underline transition-all flex items-center gap-0.5">
                  <span>{isRtl ? "פתח מחברת" : "Open Notebook"}</span>
                  <span className="material-symbols-outlined text-xs font-bold">
                    {isRtl ? "arrow_left" : "arrow_right"}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
