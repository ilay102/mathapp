"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getNotebooks, createNotebook, getSessionUser, syncLocalData } from "@/lib/dataService";
import type { DbNotebook } from "@/lib/dataService";
import { loadLang, t, type Lang, saveLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<DbNotebook[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loadingNb, setLoadingNb] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [isOpen, setIsOpen] = useState(false); // mobile responsive open state

  const loadData = async () => {
    try {
      const u = await getSessionUser();
      setUserEmail(u?.email ?? null);
      if (u) {
        // Automatically sync guest data upon sign-in
        await syncLocalData();
      }
      const list = await getNotebooks();
      setNotebooks(list);
    } catch (e) {
      console.error("Failed to load notebooks in sidebar", e);
    }
  };

  useEffect(() => {
    setLang(loadLang());
    loadData();
    // Add custom event listener for manual trigger reloading
    window.addEventListener("reloadNotebooks", loadData);
    return () => window.removeEventListener("reloadNotebooks", loadData);
  }, []);

  const handleAddNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoadingNb(true);
    try {
      const newNb = await createNotebook(newTitle.trim());
      setNewTitle("");
      await loadData();
      router.push(`/notebooks/${newNb.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNb(false);
    }
  };

  const handleSignOut = async () => {
    const sb = createClient();
    await sb.auth.signOut();
    setUserEmail(null);
    router.push("/");
    window.location.reload();
  };

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "he" : "en";
    setLang(nextLang);
    saveLang(nextLang);
    window.location.reload(); // refresh to propagate i18n
  };

  const isRtl = lang === "he";

  // Check if link is active
  const isActive = (path: string) => pathname === path;
  const isNotebookActive = (id: string) => pathname.includes(`/notebooks/${id}`);

  return (
    <>
      {/* Mobile Header bar */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-lowest px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-sm font-semibold">auto_fix_high</span>
          </div>
          <span className="note-title text-lg font-bold text-on-surface">MathPad</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">{isOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Sidebar container */}
      <aside
        dir={isRtl ? "rtl" : "ltr"}
        className={`fixed bottom-0 top-[53px] z-30 flex w-72 flex-col border-r border-outline-variant/40 bg-surface-container-lowest/85 backdrop-blur-md transition-transform duration-200 md:top-0 md:translate-x-0 ${
          isOpen ? (isRtl ? "right-0 translate-x-0" : "left-0 translate-x-0") : (isRtl ? "right-0 translate-x-full" : "left-0 -translate-x-full")
        } md:static`}
      >
        {/* Logo (Desktop only) */}
        <div className="hidden items-center gap-3 px-6 py-5 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_fix_high
            </span>
          </div>
          <div>
            <h1 className="note-title text-xl font-bold tracking-tight text-on-surface">MathPad</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-outline">
              Engineering Study Env
            </p>
          </div>
        </div>

        {/* Tools Section */}
        <div className="px-4 py-2">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-outline">
            {isRtl ? "כלים" : "Tools"}
          </div>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>{isRtl ? "לוח בקרה" : "Dashboard"}</span>
            </Link>
            <Link
              href="/practice"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/practice")
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">school</span>
              <span>{isRtl ? "סימניות לשינון" : "Spaced Repetition"}</span>
            </Link>
            <Link
              href="/exams"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/exams")
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">assignment</span>
              <span>{isRtl ? "סימולטור מבחנים" : "Exam Simulator"}</span>
            </Link>
            <Link
              href="/tools"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/tools")
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">construction</span>
              <span>{isRtl ? "כלים הנדסיים" : "Engineering Tools"}</span>
            </Link>
          </nav>
        </div>

        {/* Notebooks Section */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              {isRtl ? "מחברות קורסים" : "Course Notebooks"}
            </span>
            <span className="text-xs font-bold text-outline">({notebooks.length})</span>
          </div>

          <nav className="space-y-0.5">
            {notebooks.map((nb) => (
              <Link
                key={nb.id}
                href={`/notebooks/${nb.id}`}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isNotebookActive(nb.id)
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container/60"
                }`}
              >
                <span className="material-symbols-outlined text-lg">folder_open</span>
                <span className="truncate flex-1">{nb.title}</span>
              </Link>
            ))}
          </nav>

          {/* Quick Add Notebook Form */}
          <form onSubmit={handleAddNotebook} className="mt-2 px-1">
            <div className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-2 py-1 focus-within:border-primary">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={isRtl ? "מחברת חדשה..." : "New Course..."}
                disabled={loadingNb}
                className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
              />
              <button
                type="submit"
                disabled={loadingNb || !newTitle.trim()}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Area with Profile and Lang Switch */}
        <div className="border-t border-outline-variant/40 p-4 space-y-3 bg-surface-container-low/40">
          {/* Language and theme switcher */}
          <div className="flex justify-between items-center text-xs">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-medium"
            >
              <span className="material-symbols-outlined text-sm">translate</span>
              <span>{isRtl ? "עברית" : "English"}</span>
            </button>
            <span className="text-[10px] text-outline uppercase tracking-wider">v1.1</span>
          </div>

          {/* User profile */}
          <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/40">
            {userEmail ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-secondary">account_circle</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-on-surface leading-none">{userEmail}</p>
                    <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">Pro Member</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-lg bg-surface px-2 py-1 text-center text-xs font-medium text-error hover:bg-error/10 transition-colors"
                >
                  {isRtl ? "התנתק" : "Sign Out"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-on-surface-variant leading-snug">
                  {isRtl ? "התחבר כדי לסנכרן את המחברות שלך." : "Sign in to sync your notebooks across devices."}
                </div>
                <Link
                  href="/login"
                  className="block w-full rounded-lg bg-black px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-black/80 transition-colors"
                >
                  {isRtl ? "התחבר למערכת" : "Sign In"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}
