"use client";

import { useState } from "react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import MathText from "./MathText";
import FunctionGraph from "./FunctionGraph";
import PracticeMore from "./PracticeMore";
import { type Lang, t, localizeDomain, localizeTechnique } from "@/lib/i18n";

export type ErrorEntry = {
  lineIndex: number;
  errorType: string;
  wrongSnippet: string | null;
  correctedLine: string;
  inheritsFromLine: number | null;
  hints: { l1: string; l2: string; l3: string };
};

export type CheckResultData = {
  status: "correct" | "wrong" | "incomplete" | "unreadable";
  confidence: number;
  errors?: ErrorEntry[];
  uncertainty: string | null;
  domain?: string | null;
  technique?: string | null;
  finalAnswer?: string | null;
  graphExpr?: string | null;
  graphRange?: [number, number] | null;
  studentExpr?: string | null;
  integralRange?: [number, number] | null;
  workedSolution?: { math: string; explain: string }[] | null;
  // legacy single-error fields (still populated by API for back-compat)
  firstErrorLineIndex?: number | null;
  errorType?: string | null;
  correctedLine?: string | null;
  wrongSnippet?: string | null;
  hints?: { l1: string; l2: string; l3: string } | null;
};

function SafeLatex({ tex, className = "" }: { tex: string; className?: string }) {
  try {
    return <span className={className}><InlineMath math={tex} /></span>;
  } catch {
    return <code className={`rounded bg-neutral-100 px-1 ${className}`}>{tex}</code>;
  }
}

function normalizeForMatch(s: string): string {
  const sup: Record<string, string> = { "⁰":"^0","¹":"^1","²":"^2","³":"^3","⁴":"^4","⁵":"^5","⁶":"^6","⁷":"^7","⁸":"^8","⁹":"^9","⁺":"+","⁻":"-" };
  const sub: Record<string, string> = { "₀":"_0","₁":"_1","₂":"_2","₃":"_3","₄":"_4","₅":"_5","₆":"_6","₇":"_7","₈":"_8","₉":"_9" };
  return s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (c) => sup[c] ?? c)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => sub[c] ?? c)
    .replace(/·/g, "*").replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/\s+/g, " ").trim();
}

function locateSnippet(line: string, snippet: string): { start: number; end: number } | null {
  if (!snippet) return null;
  const direct = line.indexOf(snippet);
  if (direct >= 0) return { start: direct, end: direct + snippet.length };
  const normLine = normalizeForMatch(line);
  const normSnip = normalizeForMatch(snippet);
  const ni = normLine.indexOf(normSnip);
  if (ni < 0) return null;
  let origStart = 0, normPos = 0;
  while (origStart < line.length && normPos < ni) {
    normPos += normalizeForMatch(line[origStart] ?? "").length;
    origStart++;
  }
  let origEnd = origStart, normLen = 0;
  while (origEnd < line.length && normLen < normSnip.length) {
    normLen += normalizeForMatch(line[origEnd] ?? "").length;
    origEnd++;
  }
  return { start: origStart, end: origEnd };
}

function LineWithSnippetMark({ line, snippet }: { line: string; snippet?: string | null }) {
  if (!snippet || snippet === line) return <SafeLatex tex={line} className="text-error" />;
  const loc = locateSnippet(line, snippet);
  if (!loc) return <SafeLatex tex={line} className="text-error" />;
  const before = line.slice(0, loc.start);
  const middle = line.slice(loc.start, loc.end);
  const after  = line.slice(loc.end);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1 align-baseline">
      {before.trim() && <SafeLatex tex={before} className="text-on-surface" />}
      <span className="relative inline-block">
        <SafeLatex tex={middle} className="text-error font-bold" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-error/80 rounded" />
      </span>
      {after.trim() && <SafeLatex tex={after} className="text-on-surface" />}
    </span>
  );
}

export default function CheckResult({
  result,
  studentLines,
  problem,
  lang = "en",
}: {
  result: CheckResultData;
  studentLines: string[];
  problem?: string;
  lang?: Lang;
}) {
  // Normalize errors to a Map keyed by lineIndex for fast lookup.
  const errors: ErrorEntry[] = result.errors && result.errors.length > 0
    ? result.errors
    : result.firstErrorLineIndex !== null && result.firstErrorLineIndex !== undefined
      ? [{
          lineIndex: result.firstErrorLineIndex,
          errorType: result.errorType ?? "other",
          wrongSnippet: result.wrongSnippet ?? null,
          correctedLine: result.correctedLine ?? "",
          inheritsFromLine: null,
          hints: result.hints ?? { l1: "", l2: "", l3: "" },
        }]
      : [];

  const errorByLine = new Map<number, ErrorEntry>();
  errors.forEach((e) => errorByLine.set(e.lineIndex, e));

  const confPct = Math.round((result.confidence ?? 0) * 100);
  const errorCount = errors.length;

  return (
    <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 bg-surface-container-lowest/90 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-secondary">auto_awesome</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{t("lumenResult", lang)}</span>
          {result.domain && (
            <span className="rounded-full bg-primary-fixed/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {localizeDomain(result.domain, lang)}
            </span>
          )}
          {result.technique && (
            <span className="rounded-full bg-secondary-fixed/60 px-2 py-0.5 text-[10px] font-medium text-secondary">
              {localizeTechnique(result.technique, lang)}
            </span>
          )}
        </div>
        <span className="text-xs text-outline">{confPct}% {t("sure", lang)}</span>
      </div>

      {/* Final answer banner — what the answer SHOULD be */}
      {result.finalAnswer && (
        <div className="flex items-start gap-3 border-b border-outline-variant/30 bg-tertiary-fixed/30 px-5 py-3">
          <span className="material-symbols-outlined text-tertiary">flag</span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">{t("finalAnswerShould", lang)}</div>
            <div className="mt-0.5 text-lg text-on-surface">
              <SafeLatex tex={result.finalAnswer} />
            </div>
          </div>
        </div>
      )}

      {/* Function graph — only when the grader signalled this is a function problem */}
      {result.graphExpr && (
        <div className="border-b border-outline-variant/30 px-5 py-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">show_chart</span>
            {t("graphTitle", lang)}
            {result.graphRange && (
              <span className="text-on-surface-variant/70 normal-case font-normal">
                ({t("graphRange", lang)} [{result.graphRange[0]}, {result.graphRange[1]}])
              </span>
            )}
          </div>
          <FunctionGraph
            range={result.graphRange ?? undefined}
            integralRange={result.integralRange ?? undefined}
            curves={[
              { expr: result.graphExpr, color: "#10b981", label: result.graphExpr, style: "solid" },
              ...(result.studentExpr ? [{
                expr: result.studentExpr,
                color: "#dc2626",
                label: `(yours) ${result.studentExpr}`,
                style: "dashed" as const,
              }] : []),
            ]}
          />
        </div>
      )}

      {/* Problem restatement */}
      {problem && (
        <div className="border-b border-outline-variant/30 px-5 py-3">
          <div className="text-[11px] uppercase tracking-wider text-on-surface-variant/70">{t("problem", lang)}</div>
          <div className="mt-1 text-base text-on-surface" dir="auto"><MathText>{problem}</MathText></div>
        </div>
      )}

      {/* Status banner */}
      {result.status === "correct" && (
        <div className="flex items-center gap-3 border-b border-emerald-200/60 bg-emerald-50/70 px-5 py-3">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <div className="text-sm font-semibold text-emerald-900">{t("everyStepChecks", lang)}</div>
        </div>
      )}
      {result.status === "wrong" && (
        <div className="flex items-center gap-3 border-b border-error-container bg-error-container/40 px-5 py-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="text-sm">
            <span className="font-semibold text-on-error-container">
              {errorCount} {errorCount === 1 ? t("mistakeFound", lang) : t("mistakesFound", lang)}
            </span>
            <span className="ml-2 text-on-surface-variant">— {t("seeMarkedLines", lang)}</span>
          </div>
        </div>
      )}
      {(result.status === "incomplete" || result.status === "unreadable") && (
        <div className="flex items-center gap-3 border-b border-amber-200/60 bg-amber-50/70 px-5 py-3">
          <span className="material-symbols-outlined text-amber-700">help</span>
          <div className="text-sm text-amber-900">
            {result.status === "incomplete" ? t("unfinished", lang) : t("couldntRead", lang)}
          </div>
        </div>
      )}

      {/* Lines */}
      {studentLines.length > 0 && (
        <ol className="space-y-2 px-5 py-6">
          {studentLines.map((line, i) => {
            const err = errorByLine.get(i);
            const isBad = !!err;
            const isInherited = err && err.inheritsFromLine !== null;
            return <ExerciseLine key={i} idx={i} line={line} err={err} isBad={isBad} isInherited={!!isInherited} lang={lang} />;
          })}
        </ol>
      )}

      {result.uncertainty && (
        <div className="border-t border-amber-200/60 bg-amber-50/70 px-5 py-2 text-sm text-amber-900">
          {result.uncertainty}
        </div>
      )}

      {/* Worked solution — reveal-on-tap so we don't spoil it for everyone */}
      {result.workedSolution && result.workedSolution.length > 0 && (
        <WorkedSolution steps={result.workedSolution} lang={lang} />
      )}

      {/* Practice more like this — only when the student got it wrong */}
      {result.status === "wrong" && problem && (
        <PracticeMore
          problem={problem}
          technique={result.technique ?? null}
          domain={result.domain ?? null}
          lang={lang}
        />
      )}
    </section>
  );
}

function WorkedSolution({ steps, lang }: { steps: { math: string; explain: string }[]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-outline-variant/30 bg-surface-container-low/40 px-5 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-tertiary px-4 py-2 text-sm font-semibold text-on-tertiary hover:bg-tertiary/90"
      >
        <span className="material-symbols-outlined text-base">
          {open ? "visibility_off" : "menu_book"}
        </span>
        {open ? t("hideSolution", lang) : t("imStuck", lang)}
      </button>
      {open && (
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg text-on-surface">
                  <SafeLatex tex={s.math} />
                </div>
                {s.explain && (
                  <p className="mt-1 text-sm text-on-surface-variant" dir="auto">
                    <MathText>{s.explain}</MathText>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ExerciseLine({
  idx: _idx, line, err, isBad, isInherited, lang,
}: { idx: number; line: string; err?: ErrorEntry; isBad: boolean; isInherited: boolean; lang: Lang }) {
  const [hintLevel, setHintLevel] = useState(1);
  return (
    <li className={"rounded-lg border " + (
      isBad ? (isInherited ? "border-amber-300 bg-amber-50/40" : "border-error/30 bg-error-container/30")
            : "border-outline-variant/30 bg-white"
    )}>
      <div className="flex items-start gap-3 p-3">
        <span className={
          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
          (isBad ? (isInherited ? "bg-amber-500 text-white" : "bg-error text-on-error")
                 : "bg-emerald-100 text-emerald-700")
        }>
          {isBad ? "✗" : "✓"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-lg leading-tight">
            {isBad
              ? <LineWithSnippetMark line={line} snippet={err?.wrongSnippet} />
              : <SafeLatex tex={line} className="text-on-surface" />}
          </div>

          {/* Per-error reveal */}
          {err && (
            <div className="mt-2 space-y-2">
              {err.inheritsFromLine !== null && (
                <div className="text-[11px] text-amber-800" dir="auto">
                  {t("followsFrom", lang)} {(err.inheritsFromLine ?? 0) + 1} — {t("fixFirst", lang)}
                </div>
              )}
              {/* L1 AI Note — always visible on the bad line */}
              <div className="glass-panel rounded-md p-2.5">
                <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  {t("aiNote", lang)} · {err.errorType}
                </div>
                <p className="text-sm text-on-surface" dir="auto"><MathText>{err.hints.l1}</MathText></p>
              </div>

              {hintLevel >= 2 && (
                <div className="rounded-md border border-primary-fixed-dim/60 bg-primary-fixed/50 p-2.5">
                  <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{t("whatWentWrong", lang)}</div>
                  <p className="text-sm text-on-surface" dir="auto"><MathText>{err.hints.l2}</MathText></p>
                </div>
              )}

              {hintLevel >= 3 && (
                <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-2.5">
                  <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {t("tryThisInstead", lang)}
                  </div>
                  <div className="text-lg text-emerald-900">
                    <SafeLatex tex={err.correctedLine} />
                  </div>
                  {err.hints.l3 && (
                    <p className="mt-1 text-xs text-emerald-800" dir="auto"><MathText>{err.hints.l3}</MathText></p>
                  )}
                </div>
              )}

              {hintLevel < 3 && (
                <button
                  onClick={() => setHintLevel((h) => Math.min(3, h + 1))}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
                >
                  {hintLevel === 1 ? t("explainWhy", lang) : t("showCorrect", lang)}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
