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
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const nb = await createNotebook(newTitle.trim());
      setNewTitle("");
      // Dispatch event to refresh sidebar
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
      className="mx-auto max-w-4xl p-5 sm:p-8 space-y-6 min-h-screen pb-24"
    >
      {/* Welcome & Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <h1 className="note-title text-3xl font-extrabold text-on-surface">
            {isRtl ? "המחברות שלי" : "My Study Notebooks"}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {isRtl
              ? "ארגן את התרגילים והמבחנים שלך לפי קורסים"
              : "Organize your calculations and assignments by course"}
          </p>
        </div>

        {/* Create new course */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isRtl ? "שם הקורס..." : "Course name..."}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/95 disabled:opacity-50 transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>{isRtl ? "קורס חדש" : "New Course"}</span>
          </button>
        </form>
      </header>

      {/* Guest Banner */}
      {isGuest && (
        <div className="rounded-2xl bg-primary-container/30 border border-primary/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5">cloud_queue</span>
            <div>
              <h3 className="text-sm font-semibold text-on-primary-container">
                {isRtl ? "עבודה במצב אורח (מקומי)" : "Working in Guest Mode"}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {isRtl
                  ? "המחברות נשמרות בדפדפן זה בלבד. התחבר כדי לסנכרן לענן ולגשת מכל מכשיר או טאבלט."
                  : "Notebooks are saved locally in this browser. Sign in to backup online and access from iPad/tablet."}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-black px-4 py-1.5 text-center text-xs font-semibold text-white hover:bg-black/80 transition-colors shrink-0"
          >
            {isRtl ? "התחבר עכשיו" : "Sign In Now"}
          </Link>
        </div>
      )}

      {/* Search Filter */}
      {notebooks.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2 max-w-md shadow-inner">
          <span className="material-symbols-outlined text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "חפש קורס..." : "Filter courses..."}
            className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
        </div>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-2xl bg-surface-container animate-pulse" />
          <div className="h-32 rounded-2xl bg-surface-container animate-pulse" />
        </div>
      ) : filteredNotebooks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-outline">folder_open</span>
          <p className="mt-3 text-sm text-on-surface-variant">
            {searchQuery
              ? (isRtl ? "לא נמצאו קורסים מתאימים לחיפוש." : "No courses matching your search.")
              : (isRtl ? "אין לך עדיין מחברות קורסים. צור את הראשונה למעלה!" : "You don't have any course notebooks yet. Create your first above!")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotebooks.map((nb) => (
            <Link
              key={nb.id}
              href={`/notebooks/${nb.id}`}
              className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 hover:border-primary transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-secondary">
                    <span className="material-symbols-outlined text-xl">folder</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(nb.id, e)}
                    className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-surface-container"
                    title={isRtl ? "מחק קורס" : "Delete course"}
                  >
                    <span className="material-symbols-outlined text-lg">delete_outline</span>
                  </button>
                </div>
                <h3 className="note-title text-xl font-bold text-on-surface mt-3 truncate">
                  {nb.title}
                </h3>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant/20 mt-4 pt-3 text-[10px] text-outline font-medium uppercase tracking-wider">
                <span>{new Date(nb.updated_at).toLocaleDateString()}</span>
                <span className="text-primary hover:underline">{isRtl ? "פתח מחברת ←" : "Open Notebook →"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
