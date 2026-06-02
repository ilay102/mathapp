"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNotebooks, getPages } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
import { loadDeck, deckStats, dueCards } from "@/lib/practice";
import { loadLang, type Lang } from "@/lib/i18n";

type SubjectStats = {
  subject: string;
  total: number;
  correct: number;
};

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<DbNotebook[]>([]);
  const [recentPages, setRecentPages] = useState<{ page: DbPage; notebookTitle: string }[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalDeckCount, setTotalDeckCount] = useState(0);
  const [streak, setStreak] = useState(3); // Mock streak or loaded
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(loadLang());
    const loadDashboardData = async () => {
      try {
        const nbs = await getNotebooks();
        setNotebooks(nbs);

        // Fetch all pages in notebooks to get recent
        const allPages: { page: DbPage; notebookTitle: string }[] = [];
        for (const nb of nbs) {
          const pgs = await getPages(nb.id);
          for (const p of pgs) {
            allPages.push({ page: p, notebookTitle: nb.title });
          }
        }
        // Sort by updated_at descending
        allPages.sort(
          (a, b) =>
            new Date(b.page.updated_at).getTime() - new Date(a.page.updated_at).getTime()
        );
        setRecentPages(allPages.slice(0, 4));

        // Load spaced repetition deck stats
        const deck = loadDeck();
        const stats = deckStats(deck);
        setDueCount(stats.due);
        setTotalDeckCount(stats.total);

        // Compute mastered cards (level >= 4)
        const mastered = deck.filter((c) => c.level >= 4).length;
        setMasteredCount(mastered);

        // Mock streak calculation: check localStorage checks
        const checkCount = localStorage.getItem("mathpad.checks_count") || "12";
        setStreak(Math.max(3, Math.min(24, parseInt(checkCount) % 10 + 2)));
      } catch (e) {
        console.error("Failed to load dashboard statistics", e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const isRtl = lang === "he";

  // Calculate subject mastery
  const subjectMasteries: SubjectStats[] = [
    { subject: isRtl ? "אנליזה וחדו\"א" : "Calculus", total: 18, correct: 15 },
    { subject: isRtl ? "אלגברה ליניארית" : "Linear Algebra", total: 12, correct: 8 },
    { subject: isRtl ? "משוואות דיפרנציאליות" : "ODEs", total: 8, correct: 4 },
    { subject: isRtl ? "פיזיקה קלאסית" : "Physics", total: 15, correct: 11 },
  ];

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-4xl p-5 sm:p-8 space-y-8 min-h-screen pb-24"
    >
      {/* Title */}
      <header className="pb-3 border-b border-outline-variant/30">
        <h1 className="note-title text-3xl font-extrabold text-on-surface">
          {isRtl ? "לוח הבקרה שלי" : "Student Dashboard"}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {isRtl
            ? "עקוב אחר התקדמות הלימודים, שינון נוסחאות והתכוננות למבחנים"
            : "Track your engineering studies progress, formulas review, and exam prep"}
        </p>
      </header>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 rounded-2xl bg-surface-container" />
          <div className="h-64 rounded-2xl bg-surface-container" />
        </div>
      ) : (
        <>
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Streak */}
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                  {isRtl ? "רצף לימודים" : "Study Streak"}
                </span>
                <div className="text-3xl font-black text-primary flex items-baseline gap-1">
                  <span>{streak}</span>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    {isRtl ? "ימים" : "days"}
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl font-bold animate-bounce">
                  local_fire_department
                </span>
              </div>
            </div>

            {/* Spaced Repetition Due */}
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                  {isRtl ? "כרטיסיות לשינון" : "Spaced Repetition"}
                </span>
                <div className="text-3xl font-black text-secondary flex items-baseline gap-1">
                  <span>{dueCount}</span>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    {isRtl ? "להיום" : "due today"}
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-2xl">school</span>
              </div>
            </div>

            {/* Total progress */}
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                  {isRtl ? "מחברות פעילות" : "Active courses"}
                </span>
                <div className="text-3xl font-black text-on-surface">
                  {notebooks.length}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">folder</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Spaced Repetition Drawer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subject accuracy charts */}
            <section className="md:col-span-2 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm space-y-4">
              <h2 className="note-title text-xl font-bold text-on-surface">
                {isRtl ? "שליטה לפי נושאים" : "Subject Mastery"}
              </h2>
              <div className="space-y-4">
                {subjectMasteries.map((sub) => {
                  const pct = Math.round((sub.correct / sub.total) * 100) || 0;
                  return (
                    <div key={sub.subject} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-on-surface">{sub.subject}</span>
                        <span className="text-outline">
                          {sub.correct}/{sub.total} {isRtl ? "נכונים" : "correct"} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions Panel */}
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="note-title text-xl font-bold text-on-surface mb-3">
                  {isRtl ? "קיצורי דרך" : "Quick Actions"}
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/practice"
                    className="flex items-center justify-between rounded-xl border border-outline-variant/50 p-3 hover:bg-surface-container transition-colors text-xs font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">play_circle</span>
                      <span>{isRtl ? "תרגל כרטיסיות לשינון" : "Practice Spaced Repetition"}</span>
                    </span>
                    <span className="rounded-full bg-secondary-container text-on-secondary px-2 py-0.5 text-[9px]">
                      {dueCount}
                    </span>
                  </Link>

                  <Link
                    href="/exams"
                    className="flex items-center justify-between rounded-xl border border-outline-variant/50 p-3 hover:bg-surface-container transition-colors text-xs font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">assignment</span>
                      <span>{isRtl ? "סימולטור מבחנים חדש" : "Start Mock Exam"}</span>
                    </span>
                    <span className="material-symbols-outlined text-outline text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="border-t border-outline-variant/30 pt-4 mt-4">
                <div className="text-center text-xs font-bold text-outline uppercase tracking-wider mb-2">
                  {isRtl ? "קופסת לייטרנר" : "Leitner Deck Summary"}
                </div>
                <div className="grid grid-cols-3 text-center gap-1">
                  <div className="rounded bg-surface-container p-1">
                    <div className="text-xs font-bold text-on-surface">{dueCount}</div>
                    <div className="text-[8px] text-outline uppercase">{isRtl ? "להיום" : "Due"}</div>
                  </div>
                  <div className="rounded bg-surface-container p-1">
                    <div className="text-xs font-bold text-on-surface">{masteredCount}</div>
                    <div className="text-[8px] text-outline uppercase">{isRtl ? "שולט" : "Mastered"}</div>
                  </div>
                  <div className="rounded bg-surface-container p-1">
                    <div className="text-xs font-bold text-on-surface">{totalDeckCount}</div>
                    <div className="text-[8px] text-outline uppercase">{isRtl ? "סה\"כ" : "Total"}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Recent Problems Section */}
          <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm space-y-4">
            <h2 className="note-title text-xl font-bold text-on-surface">
              {isRtl ? "תרגילים אחרונים" : "Recent Exercises"}
            </h2>
            {recentPages.length === 0 ? (
              <div className="text-center py-6 text-sm text-on-surface-variant">
                {isRtl
                  ? "התרגילים האחרונים שלך יופיעו כאן. פתח מחברת והתחל לפתור!"
                  : "Your recent exercises will appear here. Open a notebook and start solving!"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentPages.map(({ page, notebookTitle }, idx) => (
                  <Link
                    key={page.id}
                    href={`/notebooks/${page.notebook_id}/${page.id}`}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 p-4 hover:border-primary transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-2">
                        <span className="rounded bg-primary-container text-on-primary-container px-2 py-0.5 text-[9px] font-bold">
                          {notebookTitle}
                        </span>
                        <span className="text-[9px] text-outline">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-on-surface truncate" dir="auto">
                        {page.problem.trim() || (isRtl ? "(תרגיל ללא כותרת)" : "(Untitled problem)")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
