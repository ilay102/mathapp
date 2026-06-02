"use client";

import { useState } from "react";
import { loadDeck, newCard, saveDeck } from "@/lib/practice";
import { type Lang, t } from "@/lib/i18n";

type Suggestion = { problem: string; expectedTechnique?: string; difficulty?: string };

export default function PracticeMore({
  problem, technique, domain, lang,
}: { problem: string; technique?: string | null; domain?: string | null; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem, technique, domain, language: lang, n: 3 }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Couldn't generate");
      setSuggestions(json.problems || []);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function addToDeck(idx: number) {
    const s = suggestions[idx];
    if (!s) return;
    const deck = loadDeck();
    deck.push(newCard(s.problem, s.expectedTechnique ?? technique ?? null, domain ?? null, "generated"));
    saveDeck(deck);
    setAdded((prev) => new Set(prev).add(idx));
  }

  return (
    <div className="border-t border-outline-variant/30 bg-surface-container-low/40 px-5 py-3">
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">
          {loading ? "hourglass_top" : "school"}
        </span>
        {loading ? t("generating", lang) : t("practiceMore", lang)}
      </button>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      {open && suggestions.length > 0 && (
        <ol className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface" dir="auto">{s.problem}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  {s.difficulty && <span className="rounded-full bg-primary-fixed/50 px-2 py-0.5 text-primary">{s.difficulty}</span>}
                  {s.expectedTechnique && <span className="text-on-surface-variant">{s.expectedTechnique}</span>}
                </div>
              </div>
              <button
                onClick={() => addToDeck(i)}
                disabled={added.has(i)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (added.has(i)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-primary text-on-primary hover:bg-primary/90")
                }
              >
                {added.has(i) ? "✓ " + t("addToDeck", lang) : t("addToDeck", lang)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
