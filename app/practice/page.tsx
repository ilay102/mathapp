"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyVerdict, deckStats, dueCards, loadDeck, saveDeck, type DeckCard } from "@/lib/practice";
import { loadLang, type Lang, t } from "@/lib/i18n";
import CheckResult, { type CheckResultData } from "@/components/CheckResult";

export default function PracticePage() {
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [lang, setLang] = useState<Lang>("en");
  const [current, setCurrent] = useState<DeckCard | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLang(loadLang());
    setDeck(loadDeck());
    setReady(true);
  }, []);

  useEffect(() => { if (ready) saveDeck(deck); }, [deck, ready]);

  const stats = ready ? deckStats(deck) : { total: 0, due: 0, byTech: {} };
  const due = ready ? dueCards(deck) : [];

  function startSession() {
    setCurrent(due[0] ?? null);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  async function check() {
    if (!current || loading) return;
    setLoading(true); setError(null);
    try {
      const studentLines = answer.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!studentLines.length) throw new Error(t("writeFirst", lang));
      const res = await fetch("/api/check-work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem: current.problem, studentLines, language: lang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Check failed");
      const r = json.result as CheckResultData;
      setResult(r);
      setDeck((prev) => prev.map((c) =>
        c.id === current.id ? applyVerdict(c, r.status === "correct" ? "correct" : "wrong") : c
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  // Refetches due list and goes to next card, or sets current to null if done
  function next() {
    const freshDeck = loadDeck(); // reload deck to get latest dates
    const freshDue = dueCards(freshDeck);
    const remaining = freshDue.filter((c) => c.id !== current?.id);
    setCurrent(remaining[0] ?? null);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  function removeFromDeck(id: string) {
    const confirmMsg = lang === "he" ? "להסיר תרגיל זה מהרשימה לשינון?" : "Remove this exercise from practice deck?";
    if (!window.confirm(confirmMsg)) return;
    setDeck((prev) => prev.filter((c) => c.id !== id));
    if (current?.id === id) {
      const remaining = due.filter((c) => c.id !== id);
      setCurrent(remaining[0] ?? null);
      setAnswer("");
      setResult(null);
      setError(null);
    }
  }

  const isRtl = lang === "he";

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-on-surface animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
      {/* Sticky top sub-header */}
      <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <div>
              <h1 className="note-title text-2xl font-bold text-on-surface leading-none">{t("practice", lang)}</h1>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-outline font-bold">
                {stats.due} {t("dueToday", lang)} · {stats.total} total
              </p>
            </div>
          </div>
          <Link 
            href="/notebooks" 
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-low px-4.5 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            {t("notebook2", lang)}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 space-y-6">
        {/* EMPTY STATE */}
        {deck.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-12 text-center max-w-md mx-auto space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary mx-auto">
              <span className="material-symbols-outlined text-4xl">school</span>
            </div>
            <p className="text-sm font-semibold text-on-surface-variant leading-relaxed" dir="auto">{t("emptyDeck", lang)}</p>
            <Link 
              href="/notebooks" 
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-on-primary hover:bg-primary/95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              {t("notebook2", lang)}
            </Link>
          </div>
        )}

        {/* DECK SUMMARY PANEL */}
        {deck.length > 0 && !current && (
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold note-title text-on-surface">{t("practice", lang)}</h2>
              <p className="mt-1 text-xs text-on-surface-variant font-medium">
                {stats.due} {t("dueToday", lang)} · {stats.total - stats.due} {t("scheduled", lang) ?? "scheduled"}
              </p>
            </div>

            {/* Techniques grids */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(stats.byTech).map(([tech, s]) => (
                <div key={tech} className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-4 space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-outline truncate">{tech}</div>
                  <div className="text-xs font-bold text-on-surface">
                    {s.mastered}/{s.total} {t("mastered", lang)}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startSession}
              disabled={stats.due === 0}
              className="ai-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-secondary disabled:opacity-40 disabled:scale-100 transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">play_arrow</span>
              {t("startSession", lang)}
            </button>

            <div className="border-t border-outline-variant/20 pt-6 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
                {isRtl ? "כרטיסיות בחפיסה" : "Cards in Deck"}
              </div>
              <ol className="space-y-3">
                {deck.slice(0, 20).map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low/20 p-4 hover:border-outline-variant/60 transition-all group">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-semibold text-on-surface leading-snug" dir="auto">{c.problem}</p>
                      <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider">
                        {c.technique && <span className="rounded-lg bg-secondary/10 px-2 py-0.5 text-secondary">{c.technique}</span>}
                        <span className="rounded-lg bg-surface-container px-2 py-0.5 text-outline">level {c.level}/5</span>
                        <span className="rounded-lg bg-surface-container px-2 py-0.5 text-outline">
                          {c.dueAt <= Date.now() ? t("dueToday", lang) : `due ${new Date(c.dueAt).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromDeck(c.id)} 
                      className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-surface-container" 
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-base">delete_outline</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ACTIVE PRACTICE WORKSPACE */}
        {current && (
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                {current.technique || "spaced review"} · level {current.level}/5
              </span>
              <button 
                onClick={next} 
                className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-0.5"
              >
                <span>{isRtl ? "דלג" : "skip"}</span>
                <span className="material-symbols-outlined text-sm font-bold">
                  {isRtl ? "arrow_left" : "arrow_right"}
                </span>
              </button>
            </div>

            {/* Problem card rendered like notebook paper */}
            <div className="rounded-2xl border border-outline-variant/50 bg-[#fffdf7] p-5 note-title text-xl font-bold text-on-surface shadow-sm" dir="auto">
              {current.problem}
            </div>

            {/* Input steps */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
                {t("oneStepPerLine", lang)}
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                className="notebook-textarea w-full resize-y"
                placeholder={t("oneStepPerLine", lang)}
                dir="auto"
              />
            </div>

            {/* Buttons and warnings */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={check}
                disabled={loading}
                className="ai-glow inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-secondary disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">{loading ? "hourglass_top" : "plagiarism"}</span>
                {loading ? t("checking", lang) : t("showAllMistakes", lang)}
              </button>
              {result && (
                <button 
                  onClick={next} 
                  className="rounded-full border border-outline-variant/60 bg-surface-container px-5 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  {isRtl ? "המשך ←" : "continue →"}
                </button>
              )}
              {error && (
                <span className="text-sm text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </span>
              )}
            </div>

            {/* Result grading */}
            {result && (
              <div className="pt-4 border-t border-outline-variant/20">
                <CheckResult
                  result={result}
                  studentLines={answer.split("\n").map((s) => s.trim()).filter(Boolean)}
                  problem={current.problem}
                  lang={lang}
                />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
