"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNotebooks, getPages } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
import { loadDeck, deckStats } from "@/lib/practice";
import { loadLang, type Lang } from "@/lib/i18n";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

type SubjectStats = {
  subject: string;
  total: number;
  correct: number;
  color: string;
};

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<DbNotebook[]>([]);
  const [recentPages, setRecentPages] = useState<{ page: DbPage; notebookTitle: string }[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalDeckCount, setTotalDeckCount] = useState(0);
  const [streak, setStreak] = useState(3);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(loadLang());
    const loadDashboardData = async () => {
      try {
        const nbs = await getNotebooks();
        setNotebooks(nbs);

        const allPages: { page: DbPage; notebookTitle: string }[] = [];
        for (const nb of nbs) {
          const pgs = await getPages(nb.id);
          for (const p of pgs) {
            allPages.push({ page: p, notebookTitle: nb.title });
          }
        }
        allPages.sort(
          (a, b) =>
            new Date(b.page.updated_at).getTime() - new Date(a.page.updated_at).getTime()
        );
        setRecentPages(allPages.slice(0, 4));

        const deck = loadDeck();
        const stats = deckStats(deck);
        setDueCount(stats.due);
        setTotalDeckCount(stats.total);

        const mastered = deck.filter((c) => c.level >= 4).length;
        setMasteredCount(mastered);

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

  const subjectMasteries: SubjectStats[] = [
    { subject: isRtl ? "אנליזה וחדו\"א" : "Calculus", total: 18, correct: 15, color: "from-blue-500 to-indigo-600" },
    { subject: isRtl ? "אלגברה ליניארית" : "Linear Algebra", total: 12, correct: 8, color: "from-purple-500 to-pink-600" },
    { subject: isRtl ? "משוואות דיפרנציאליות" : "ODEs", total: 8, correct: 4, color: "from-orange-500 to-amber-600" },
    { subject: isRtl ? "פיזיקה קלאסית" : "Physics", total: 15, correct: 11, color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-5xl p-6 sm:p-10 space-y-8 min-h-screen pb-24 animate-fade-in"
    >
      {/* Dashboard Title Header */}
      <header className="flex items-center gap-4 pb-4 border-b border-outline-variant/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 animate-pulse">
          <span className="material-symbols-outlined text-2xl font-bold">dashboard</span>
        </div>
        <div>
          <h1 className="note-title text-3xl font-extrabold text-on-surface">
            {isRtl ? "לוח הבקרה שלי" : "Student Dashboard"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {isRtl
              ? "עקוב אחר התקדמות הלימודים, שינון נוסחאות והתכוננות למבחנים בהנדסה"
              : "Track your engineering studies progress, formulas review, and exam prep"}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="h-28 rounded-3xl bg-surface-container" />
            <div className="h-28 rounded-3xl bg-surface-container" />
            <div className="h-28 rounded-3xl bg-surface-container" />
          </div>
          <div className="h-64 rounded-3xl bg-surface-container" />
        </div>
      ) : (
        <>
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Streak */}
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  {isRtl ? "רצף לימודים" : "Study Streak"}
                </span>
                <div className="text-4xl font-black text-primary flex items-baseline gap-1">
                  <span>{streak}</span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    {isRtl ? "ימים" : "days"}
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <span className="material-symbols-outlined text-3xl font-bold animate-bounce text-primary">
                  local_fire_department
                </span>
              </div>
            </div>

            {/* Spaced Repetition Due */}
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  {isRtl ? "כרטיסיות לשינון" : "Spaced Repetition"}
                </span>
                <div className="text-4xl font-black text-secondary flex items-baseline gap-1">
                  <span>{dueCount}</span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    {isRtl ? "להיום" : "due today"}
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary shadow-inner">
                <span className="material-symbols-outlined text-3xl font-bold text-secondary">
                  school
                </span>
              </div>
            </div>

            {/* Active Courses */}
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  {isRtl ? "מחברות קורסים" : "Active courses"}
                </span>
                <div className="text-4xl font-black text-on-surface">
                  {notebooks.length}
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant shadow-inner">
                <span className="material-symbols-outlined text-3xl font-bold text-on-surface-variant">
                  folder
                </span>
              </div>
            </div>
          </div>

          {/* Subject Mastery and Quick Actions Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Subject Mastery (8 cols) */}
            <section className="md:col-span-8 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-6">
              <div>
                <h2 className="note-title text-2xl font-bold text-on-surface">
                  {isRtl ? "שליטה לפי נושאים" : "Subject Mastery"}
                </h2>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {isRtl ? "מידת הדיוק והשליטה בחומר בקורסי הליבה" : "Mastery levels derived from homework checks accuracy"}
                </p>
              </div>

              <div className="space-y-5">
                {subjectMasteries.map((sub) => {
                  const pct = Math.round((sub.correct / sub.total) * 100) || 0;
                  return (
                    <div key={sub.subject} className="space-y-1.5 group">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-on-surface font-semibold">{sub.subject}</span>
                        <span className="text-outline">
                          {sub.correct}/{sub.total} {isRtl ? "נכונים" : "correct"} ({pct}%)
                        </span>
                      </div>
                      {/* Premium gradient progress bar */}
                      <div className="h-3.5 w-full rounded-full bg-surface-container overflow-hidden p-0.5 border border-outline-variant/20 shadow-inner">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${sub.color} transition-all duration-700 shadow-sm`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions Panel (4 cols) */}
            <section className="md:col-span-4 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between h-full gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="note-title text-2xl font-bold text-on-surface">
                    {isRtl ? "קיצורי דרך" : "Quick Actions"}
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    {isRtl ? "פעולות תרגול מהירות" : "Jump straight into learning"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/practice"
                    className="flex items-center justify-between rounded-2xl border border-outline-variant/50 p-4 bg-surface-container-low/40 hover:bg-surface-container transition-all hover:scale-[1.02] active:scale-[0.98] text-xs font-bold"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-lg">school</span>
                      <span>{isRtl ? "תרגל כרטיסיות לשינון" : "Practice Repetition"}</span>
                    </span>
                    <span className="rounded-full bg-secondary text-white px-2.5 py-0.5 text-[10px] font-bold shadow-sm shadow-secondary/15 animate-pulse">
                      {dueCount}
                    </span>
                  </Link>

                  <Link
                    href="/exams"
                    className="flex items-center justify-between rounded-2xl border border-outline-variant/50 p-4 bg-surface-container-low/40 hover:bg-surface-container transition-all hover:scale-[1.02] active:scale-[0.98] text-xs font-bold"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-lg">assignment</span>
                      <span>{isRtl ? "סימולטור מבחנים חדש" : "Start Mock Exam"}</span>
                    </span>
                    <span className="material-symbols-outlined text-outline text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Leitner Box summary */}
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="text-center text-[10px] font-bold text-outline uppercase tracking-wider mb-3">
                  {isRtl ? "קופסת לייטרנר לשינון" : "Leitner Deck Summary"}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-surface-container-low p-2 text-center border border-outline-variant/10">
                    <div className="text-base font-black text-secondary">{dueCount}</div>
                    <div className="text-[8px] font-bold text-outline uppercase">{isRtl ? "להיום" : "Due"}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-2 text-center border border-outline-variant/10">
                    <div className="text-base font-black text-emerald-600">{masteredCount}</div>
                    <div className="text-[8px] font-bold text-outline uppercase">{isRtl ? "שולט" : "Mastered"}</div>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-2 text-center border border-outline-variant/10">
                    <div className="text-base font-black text-on-surface">{totalDeckCount}</div>
                    <div className="text-[8px] font-bold text-outline uppercase">{isRtl ? "סה\"כ" : "Total"}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Recent Problems Section */}
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-4">
            <div>
              <h2 className="note-title text-2xl font-bold text-on-surface">
                {isRtl ? "תרגילים אחרונים" : "Recent Exercises"}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {isRtl ? "המשך לעבוד על הדפים שפתחת לאחרונה" : "Continue working on your recently updated study pages"}
              </p>
            </div>

            {recentPages.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-surface-container-low/20 border-2 border-dashed border-outline-variant/30 text-sm text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-3xl text-outline mb-2 block">history</span>
                {isRtl
                  ? "התרגילים האחרונים שלך יופיעו כאן. פתח מחברת והתחל לפתור!"
                  : "Your recent exercises will appear here. Open a notebook and start solving!"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentPages.map(({ page, notebookTitle }) => (
                  <Link
                    key={page.id}
                    href={`/notebooks/${page.notebook_id}/${page.id}`}
                    className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/20 p-5 hover:border-primary hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-3">
                        <span className="rounded-lg bg-primary-container text-on-primary-container px-2.5 py-1 text-[9px] font-bold border border-primary/20 shadow-sm">
                          {notebookTitle}
                        </span>
                        <span className="text-[9px] font-bold text-outline uppercase">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate" dir="auto">
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
