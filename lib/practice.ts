/**
 * Practice deck: spaced-repetition queue of problems the student has struggled with.
 *
 * Each entry tracks:
 *  - problem text + technique tag
 *  - mastery level 0..5 (Leitner-style)
 *  - dueAt timestamp (when it should resurface)
 *
 * Schedule (Leitner intervals, in days):  1, 3, 7, 14, 30, 90
 */

export type DeckCard = {
  id: string;
  problem: string;
  technique: string | null;
  domain: string | null;
  addedAt: number;
  dueAt: number;
  level: number; // 0..5
  history: { at: number; verdict: "correct" | "wrong" }[];
  source?: "exercise" | "generated";
};

const STORAGE_KEY = "mathpad.deck.v1";

const INTERVALS_MS = [
  1  * 24 * 60 * 60 * 1000,
  3  * 24 * 60 * 60 * 1000,
  7  * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  90 * 24 * 60 * 60 * 1000,
];

export function loadDeck(): DeckCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeckCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveDeck(deck: DeckCard[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); } catch { /* quota */ }
}

export function newCard(
  problem: string,
  technique: string | null = null,
  domain: string | null = null,
  source: DeckCard["source"] = "generated",
): DeckCard {
  return {
    id: Math.random().toString(36).slice(2, 10),
    problem,
    technique,
    domain,
    addedAt: Date.now(),
    dueAt: Date.now(),
    level: 0,
    history: [],
    source,
  };
}

/** Bump a card forward if correct, reset toward 0 if wrong. */
export function applyVerdict(card: DeckCard, verdict: "correct" | "wrong"): DeckCard {
  const next = { ...card, history: [...card.history, { at: Date.now(), verdict }] };
  if (verdict === "correct") {
    next.level = Math.min(5, card.level + 1);
  } else {
    next.level = Math.max(0, card.level - 1);
  }
  next.dueAt = Date.now() + INTERVALS_MS[next.level];
  return next;
}

export function dueCards(deck: DeckCard[], now = Date.now()): DeckCard[] {
  return deck.filter((c) => c.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}

export function deckStats(deck: DeckCard[]) {
  const now = Date.now();
  const due = dueCards(deck, now).length;
  const byTech: Record<string, { total: number; mastered: number }> = {};
  for (const c of deck) {
    const k = c.technique || "other";
    if (!byTech[k]) byTech[k] = { total: 0, mastered: 0 };
    byTech[k].total++;
    if (c.level >= 4) byTech[k].mastered++;
  }
  return { total: deck.length, due, byTech };
}
