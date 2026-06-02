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
      // Update the card via Leitner
      setDeck((prev) => prev.map((c) =>
        c.id === current.id ? applyVerdict(c, r.status === "correct" ? "correct" : "wrong") : c
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function next() {
    const remaining = due.filter((c) => c.id !== current?.id);
    setCurrent(remaining[0] ?? null);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  function removeFromDeck(id: string) {
    setDeck((prev) => prev.filter((c) => c.id !== id));
    if (current?.id === id) next();
  }

  const isRtl = lang === "he";

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-20 border-b border-outline-variant/60 bg-surface-container-lowest/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container text-on-secondary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <div>
              <h1 className="note-title text-xl font-semibold text-on-surface leading-none">{t("practice", lang)}</h1>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-on-surface-variant">
                {stats.due} {t("dueToday", lang)} · {stats.total} total
              </p>
            </div>
          </div>
          <Link href="/notebooks" className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-sm">menu_book</span>
            {t("notebook2", lang)}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 space-y-6">
        {/* Empty state */}
        {deck.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low/40 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-outline">school</span>
            <p className="mt-3 text-sm text-on-surface-variant" dir="auto">{t("emptyDeck", lang)}</p>
            <Link href="/notebooks" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {t("notebook2", lang)}
            </Link>
          </div>
        )}

        {/* Deck summary + start */}
        {deck.length > 0 && !current && (
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5">
            <h2 className="text-lg font-semibold note-title text-on-surface">{t("practice", lang)}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {stats.due} {t("dueToday", lang)} · {stats.total - stats.due} {t("scheduled", lang) ?? "scheduled"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(stats.byTech).map(([tech, s]) => (
                <div key={tech} className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-2">
                  <div className="text-[11px] uppercase tracking-wider text-on-surface-variant">{tech}</div>
                  <div className="text-sm font-semibold text-on-surface">{s.mastered}/{s.total} {t("mastered", lang)}</div>
                </div>
              ))}
            </div>

            <button
              onClick={startSession}
              disabled={stats.due === 0}
              className="ai-glow mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-secondary disabled:opacity-40"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              {t("startSession", lang)}
            </button>

            <ol className="mt-5 space-y-2 text-sm">
              {deck.slice(0, 20).map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low/30 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface" dir="auto">{c.problem}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {c.technique && <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-secondary">{c.technique}</span>}
                      <span>level {c.level}/5</span>
                      <span>{c.dueAt <= Date.now() ? t("dueToday", lang) : `due ${new Date(c.dueAt).toLocaleDateString()}`}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromDeck(c.id)} className="text-on-surface-variant hover:text-error" title="Remove">
                    <span className="material-symbols-outlined text-base">delete_outline</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Active practice card */}
        {current && (
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                {current.technique || "practice"} · level {current.level}/5
              </span>
              <button onClick={next} className="text-sm text-on-surface-variant hover:text-primary">
                skip →
              </button>
            </div>
            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low/40 p-4 note-title text-lg text-on-surface" dir="auto">
              {current.problem}
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="handwritten w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 text-xl leading-relaxed text-on-surface focus:border-primary focus:outline-none"
              placeholder={t("oneStepPerLine", lang)}
              dir="auto"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={check}
                disabled={loading}
                className="ai-glow inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-secondary disabled:opacity-50"
              >
                <span className="material-symbols-outlined">{loading ? "hourglass_top" : "plagiarism"}</span>
                {loading ? t("checking", lang) : t("showAllMistakes", lang)}
              </button>
              {result && (
                <button onClick={next} className="rounded-full border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
                  next →
                </button>
              )}
              {error && <span className="text-sm text-error">{error}</span>}
            </div>
            {result && (
              <CheckResult
                result={result}
                studentLines={answer.split("\n").map((s) => s.trim()).filter(Boolean)}
                problem={current.problem}
                lang={lang}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
