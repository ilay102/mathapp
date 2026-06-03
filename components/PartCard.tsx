"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckResultData } from "./CheckResult";
import ResultDrawer from "./ResultDrawer";
import MathCanvas, { type MathCanvasHandle } from "./MathCanvas";
import StrokeOverlay, { type LineVerdict } from "./StrokeOverlay";
import MathPalette from "./MathPalette";
import type { Part } from "@/lib/exercise";
import { type Lang, t } from "@/lib/i18n";
import { MathInputContext } from "@/lib/mathInputContext";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { evaluateLines } from "@/lib/evaluator";
import { format } from "@/lib/units";
import { annotateWithUnitTags } from "./UnitTag";
import DimensionalCheck from "./DimensionalCheck";

function dataURLtoBlob(dataURL: string): Blob {
  const [header, b64] = dataURL.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Heuristic: does this line look like math worth handing to KaTeX?
// Triggers on LaTeX commands, super/subscripts, $-delimited math, common math operators
// adjacent to numbers/letters, or fraction/sqrt-like patterns. Otherwise render as prose
// so explanatory lines like "let v be the velocity" stay readable.
function looksLikeMath(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/[\\^_$]/.test(t)) return true;
  if (/[=+\-*/<>≤≥≠≈±·×÷∫∑∏√π∞°]/.test(t) && /[0-9a-zA-Z]/.test(t)) return true;
  if (/\b\d+\s*[+\-*/]\s*\d/.test(t)) return true;
  return false;
}

function SafeLatex({ tex, className = "" }: { tex: string; className?: string }) {
  if (!looksLikeMath(tex)) {
    return <span className={className}>{tex}</span>;
  }
  try {
    return <span className={className}><InlineMath math={tex} /></span>;
  } catch {
    return <code className={`rounded bg-neutral-100 px-1 text-sm ${className}`}>{tex}</code>;
  }
}

function LivePreviewLineRenderer({ line, className = "" }: { line: string; className?: string }) {
  if (/[\\^_$]/.test(line)) {
    return <SafeLatex tex={line} className={className} />;
  }
  return <span className={className}>{annotateWithUnitTags(line)}</span>;
}

type Props = {
  part: Part;
  /** Index within the exercise's parts array. */
  partIndex: number;
  totalParts: number;
  /** Umbrella problem (text + optional image OCR'd) the parent will pre-compute and pass in. */
  umbrellaProblem: string;
  /** Earlier parts' verified answers, formatted for the grader prompt. */
  contextFromPrev: string;
  lang: Lang;
  onChange: (next: Part) => void;
  onRemove?: () => void;
};

export default function PartCard({
  part, partIndex, totalParts, umbrellaProblem, contextFromPrev, lang, onChange, onRemove,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"write" | "type">("write");
  const [penColor, setPenColor] = useState<string>("#1f2937");
  const [penSize, setPenSize] = useState<number>(3);
  const [canvasMode, setCanvasMode] = useState<"draw" | "erase">("draw");
  const [appendMode, setAppendMode] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [resultOpen, setResultOpen] = useState<boolean>(false);
  const canvasRef = useRef<MathCanvasHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const update = (patch: Partial<Part>) => onChange({ ...part, ...patch });

  function insertAtCursor(symbol: string) {
    const el = textareaRef.current;
    if (!el) {
      update({ linesText: part.linesText + symbol });
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = part.linesText;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const nextVal = before + symbol + after;
    update({ linesText: nextVal });

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 50);
  }

  const onFocus = () => {
    if (typeof window !== "undefined") {
      (window as any).insertMathCallback = insertAtCursor;
    }
  };

  const PEN_COLORS = [
    { name: "Ink", value: "#1f2937" }, { name: "Blue", value: "#1d4ed8" },
    { name: "Red", value: "#dc2626" }, { name: "Pencil", value: "#6b7280" },
  ];
  const PEN_SIZES = [
    { name: "Thin", value: 2 }, { name: "Medium", value: 3 }, { name: "Thick", value: 5 },
  ];

  async function readHandwriting() {
    setOcrLoading(true);
    setError(null);
    try {
      const png = canvasRef.current?.exportPNG();
      const strokes = canvasRef.current?.getStrokes() ?? [];
      if (!png || strokes.length === 0) throw new Error(t("writeSomething", lang));
      const blob = dataURLtoBlob(png);
      const fd = new FormData();
      fd.append("file", blob, "answer.png");
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "OCR failed");
      const lines: string[] = (json.lines || []).filter(Boolean);
      if (!lines.length) throw new Error(t("cantRead", lang));
      const fresh = lines.join("\n");
      update({
        linesText: appendMode && part.linesText.trim()
          ? part.linesText.trim() + "\n" + fresh
          : fresh,
      });
      canvasRef.current?.clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcrLoading(false);
    }
  }

  async function check() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Auto-OCR if there are strokes on the canvas and we're in write mode.
      let linesTextForGrading = part.linesText;
      const strokes = canvasRef.current?.getStrokes() ?? [];
      if (inputMode === "write" && strokes.length > 0) {
        const png = canvasRef.current?.exportPNG();
        if (png) {
          const blob = dataURLtoBlob(png);
          const fd = new FormData();
          fd.append("file", blob, "answer.png");
          const ocrRes = await fetch("/api/ocr", { method: "POST", body: fd });
          const ocrJson = await ocrRes.json();
          if (ocrJson.ok && Array.isArray(ocrJson.lines) && ocrJson.lines.length) {
            const fresh = ocrJson.lines.filter(Boolean).join("\n");
            linesTextForGrading = appendMode && part.linesText.trim()
              ? part.linesText.trim() + "\n" + fresh
              : fresh;
            update({ linesText: linesTextForGrading });
            canvasRef.current?.clear();
          }
        }
      }

      const studentLines = linesTextForGrading
        .split("\n").map((s) => s.trim()).filter(Boolean);
      if (!studentLines.length) throw new Error(t("writeFirst", lang));
      if (!umbrellaProblem) throw new Error(t("addProblem", lang));

      // Build the problem string with context: umbrella + previous-parts + this part's sub-prompt.
      const parts: string[] = [umbrellaProblem.trim()];
      if (contextFromPrev) parts.push("\n" + contextFromPrev);
      const thisLabel = part.label ? `(${part.label}) ` : "";
      const thisSub = part.subPrompt.trim();
      if (thisSub) parts.push(`\nCurrent ${t("part", lang)}: ${thisLabel}${thisSub}`);
      const problem = parts.join("\n");

      const res = await fetch("/api/check-work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem, studentLines, language: lang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Check failed");
      update({ lastResult: json.result as CheckResultData, lastGradedLines: studentLines });
      setResultOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function startFresh() {
    canvasRef.current?.clear();
    update({ linesText: "", lastResult: null, lastGradedLines: [], strokes: null });
    setError(null);
  }

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        check();
      } else if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "z" && inputMode === "write") {
        e.preventDefault();
        canvasRef.current?.undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("toggle-formulas"));
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [inputMode]);

  const showLabel = totalParts > 1 || part.label || part.subPrompt;

  return (
    <MathInputContext.Provider value={insertAtCursor}>
      <div ref={cardRef} className="relative space-y-4">
      {showLabel && (
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary text-sm font-bold">
            {part.label || partIndex + 1}
          </span>
          <input
            type="text"
            value={part.subPrompt}
            onChange={(e) => update({ subPrompt: e.target.value })}
            placeholder={t("subPromptPh", lang)}
            className="flex-1 bg-transparent text-base note-title text-on-surface placeholder:text-outline/60 focus:outline-none border-b border-dashed border-outline-variant/40 focus:border-primary/60 pb-1 transition-colors"
            dir="auto"
          />
          {totalParts > 1 && onRemove && (
            <button
              onClick={onRemove}
              className="text-on-surface-variant hover:text-error mt-1"
              title={t("removePart", lang)}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      )}

      {/* Work area — no labels, no card */}
      <div className="space-y-3">
        {/* Tiny mode toggle, top-right corner. Not a primary control. */}
        <div className="flex items-center justify-end gap-1">
          <div className="inline-flex rounded-full bg-white/60 p-0.5 text-xs shadow-inner border border-outline-variant/30">
            <button
              onClick={() => setInputMode("write")}
              className={"flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors " +
                (inputMode === "write" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-white")}
              title={t("write", lang)}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button
              onClick={() => setInputMode("type")}
              className={"flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors " +
                (inputMode === "type" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-white")}
              title={t("type", lang)}
            >
              <span className="material-symbols-outlined text-sm">keyboard</span>
            </button>
          </div>

          {/* Overflow Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white text-on-surface-variant transition-colors"
              aria-label="More options"
            >
              <span className="material-symbols-outlined text-base">more_vert</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-52 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-1.5 shadow-lg z-20" dir={lang === "he" ? "rtl" : "ltr"}>
                  {inputMode === "write" && (
                    <>
                      <button
                        onClick={() => { readHandwriting(); setMenuOpen(false); }}
                        disabled={ocrLoading}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>{ocrLoading ? t("reading", lang) : t("previewReading", lang)}</span>
                      </button>
                      <label className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appendMode}
                          onChange={(e) => setAppendMode(e.target.checked)}
                          className="accent-primary"
                        />
                        <span>{t("appendDontReplace", lang)}</span>
                      </label>
                      <div className="my-1 h-px bg-outline-variant/40" />
                    </>
                  )}
                  <button
                    onClick={() => { startFresh(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-error hover:bg-error-container/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    <span>{t("startFresh", lang)}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {inputMode === "write" && (
          <div className="space-y-3">
            {/* Floating glass pen toolbar */}
            <div className="tool-glass flex flex-wrap items-center gap-2 rounded-full px-3 py-1.5 sticky top-14 z-10 w-fit mx-auto">
              <div className="flex items-center gap-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setPenColor(c.value); setCanvasMode("draw"); }}
                    className={"h-6 w-6 rounded-full border-2 transition-all " +
                      (penColor === c.value && canvasMode === "draw" ? "border-on-surface scale-110" : "border-transparent")}
                    style={{ backgroundColor: c.value }}
                    aria-label={`${c.name} pen`}
                  />
                ))}
              </div>
              <div className="h-5 w-px bg-outline-variant" />
              {/* Eraser button */}
              <button
                type="button"
                onClick={() => setCanvasMode((m) => (m === "draw" ? "erase" : "draw"))}
                className={"flex h-8 w-8 items-center justify-center rounded-full transition-colors " +
                  (canvasMode === "erase" ? "bg-primary text-white shadow-sm" : "text-on-surface-variant hover:bg-white")}
                title={lang === "he" ? "מחק" : "Eraser"}
              >
                <span className="material-symbols-outlined text-lg">ink_eraser</span>
              </button>
              <div className="h-5 w-px bg-outline-variant" />
              <div className="flex items-center gap-1">
                {PEN_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setPenSize(s.value); setCanvasMode("draw"); }}
                    className={"flex h-6 w-6 items-center justify-center rounded-full transition-all " +
                      (penSize === s.value && canvasMode === "draw" ? "bg-white shadow-sm" : "hover:bg-white/60")}
                  >
                    <span className="rounded-full" style={{ width: `${s.value * 2}px`, height: `${s.value * 2}px`, backgroundColor: penColor }} />
                  </button>
                ))}
              </div>
              <div className="h-5 w-px bg-outline-variant" />
              <button onClick={() => canvasRef.current?.undo()} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-on-surface-variant hover:bg-white">
                <span className="material-symbols-outlined text-sm">undo</span> {t("undo", lang)}
              </button>
              <button onClick={() => canvasRef.current?.clear()} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-on-surface-variant hover:bg-white">
                <span className="material-symbols-outlined text-sm">clear_all</span> {t("clear", lang)}
              </button>
            </div>

            {/* Full-width tall canvas — no border, transparent so the page's ruled paper
                shows through. Bigger by default so you can actually use it like paper.
                StrokeOverlay sits above the canvas and renders red-ink crossouts / green checks
                per visual line once the grader has returned a verdict. */}
            <div className="relative w-full">
              <MathCanvas
                ref={canvasRef}
                height={520}
                color={penColor}
                size={penSize}
                initialStrokes={part.strokes || []}
                onChange={(strokes) => update({ strokes })}
                mode={canvasMode}
                className="!border-0 !bg-transparent"
              />
              {part.lastResult && part.strokes && part.strokes.length > 0 && (() => {
                // Map graded line indices to per-visual-line verdicts.
                // The OCR pipeline groups strokes into visual lines in the same order it sends
                // them to the model, so visual-line index i corresponds to studentLines[i].
                const gradedLines = part.lastGradedLines ?? [];
                const errs = part.lastResult.errors ?? (
                  part.lastResult.firstErrorLineIndex !== null && part.lastResult.firstErrorLineIndex !== undefined
                    ? [{ lineIndex: part.lastResult.firstErrorLineIndex }]
                    : []
                );
                const errorByIdx = new Set<number>();
                for (const e of errs) errorByIdx.add((e as { lineIndex: number }).lineIndex);
                const verdicts = new Map<number, LineVerdict>();
                for (let i = 0; i < gradedLines.length; i++) {
                  if (errorByIdx.has(i)) {
                    verdicts.set(i, part.lastResult.status === "incomplete" ? "incomplete" : "wrong");
                  } else {
                    verdicts.set(i, "correct");
                  }
                }
                return (
                  <StrokeOverlay
                    strokes={part.strokes}
                    verdicts={verdicts}
                    onBadgeClick={() => setResultOpen(true)}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Stale-text warning */}
        {inputMode === "write" && part.linesText.trim() && (part.strokes?.length ?? 0) === 0 && (
          <div className="flex items-start gap-2 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="material-symbols-outlined text-sm text-amber-700">history</span>
            <div className="flex-1">
              <div className="font-semibold">{t("staleTitle", lang)}</div>
              <div className="mt-0.5">{t("staleHint", lang)}</div>
            </div>
          </div>
        )}

        {/* Typed work — only show textarea + palette when in type mode, or when there's
            already OCR'd text from write mode. No headings, no labels — just the paper. */}
        {(inputMode === "type" || part.linesText.trim()) && (
          <div className="space-y-2">
            {inputMode === "type" && (
              <div className="mb-1">
                <MathPalette />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={part.linesText}
              onChange={(e) => update({ linesText: e.target.value })}
              onFocus={onFocus}
              rows={inputMode === "write" ? 3 : 6}
              className="notebook-textarea w-full resize-y"
              placeholder={inputMode === "write" ? "" : "…"}
              dir="auto"
            />
            {part.linesText.trim() && (() => {
              const { results } = evaluateLines(part.linesText.split("\n"));
              // Build per-line grader verdicts. Lines that appear in errors[] are wrong;
              // lines beyond the last error in an incomplete result are unjudged; everything else is correct.
              const gradedLines = part.lastGradedLines ?? [];
              const errorsByLine = new Map<number, "wrong" | "incomplete">();
              if (part.lastResult) {
                const errs = part.lastResult.errors ?? (
                  part.lastResult.firstErrorLineIndex !== null && part.lastResult.firstErrorLineIndex !== undefined
                    ? [{ lineIndex: part.lastResult.firstErrorLineIndex }]
                    : []
                );
                for (const e of errs) {
                  errorsByLine.set((e as { lineIndex: number }).lineIndex, part.lastResult.status === "incomplete" ? "incomplete" : "wrong");
                }
              }
              return (
                <div className="space-y-0.5">
                  {part.linesText.split("\n").map((line, i) => {
                    const evalRes = results[i];
                    const isOk = evalRes?.type === "success";
                    // Only attach a grader verdict to lines that were actually graded.
                    const wasGraded = part.lastResult && gradedLines[i] !== undefined;
                    const verdict = errorsByLine.get(i);
                    return (
                      <div key={i} className="group flex items-stretch gap-0">
                        {/* Margin badge column — sits where the red ruled-line margin runs */}
                        <button
                          type="button"
                          onClick={() => part.lastResult && setResultOpen(true)}
                          className="flex w-10 shrink-0 items-center justify-center gap-1 -mr-1 select-none"
                          aria-label={lang === "he" ? "פתח תוצאה" : "Open result"}
                          disabled={!part.lastResult}
                        >
                          {wasGraded && verdict === "wrong" && (
                            <span className="material-symbols-outlined text-error text-base font-bold drop-shadow-sm cursor-pointer hover:scale-110 transition-transform">close</span>
                          )}
                          {wasGraded && verdict === "incomplete" && (
                            <span className="material-symbols-outlined text-amber-600 text-base font-bold cursor-pointer hover:scale-110 transition-transform">lightbulb</span>
                          )}
                          {wasGraded && !verdict && (
                            <span className="material-symbols-outlined text-emerald-600 text-base font-bold drop-shadow-sm">check</span>
                          )}
                          {!wasGraded && (
                            <DimensionalCheck status={evalRes?.type ?? "empty"} error={evalRes?.type === "error" ? evalRes.error : undefined} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0 py-1 text-lg flex items-center justify-between gap-4">
                          <div className="flex-1 overflow-x-auto py-0.5">
                            <LivePreviewLineRenderer line={line} />
                          </div>
                          {isOk && evalRes.quantity && (
                            <span className="text-sm text-outline/65 font-mono italic shrink-0 select-none">
                              {`= ${format(evalRes.quantity)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* The big moment: floating Check FAB. Right-aligned, glowing, the only primary action. */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {error && (
            <span className="text-sm text-error">
              <span className="material-symbols-outlined align-middle text-sm">error</span> {error}
            </span>
          )}
          <span className="text-[10px] text-outline/60 font-mono uppercase tracking-wider">Ctrl + Enter</span>
          <button
            onClick={check}
            disabled={loading}
            className="check-fab inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
          >
            <span className="material-symbols-outlined text-lg">{loading ? "hourglass_top" : "auto_awesome"}</span>
            <span>{loading ? t("checking", lang) : t("showAllMistakes", lang)}</span>
          </button>
        </div>

        {/* If a result exists but drawer is closed, show a soft re-open pill */}
        {part.lastResult && !resultOpen && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setResultOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-bold text-secondary hover:bg-secondary/15 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              {lang === "he" ? "פתח שוב את התוצאה" : "Reopen result"}
            </button>
          </div>
        )}
      </div>

      <ResultDrawer
        open={resultOpen && !!part.lastResult}
        onClose={() => setResultOpen(false)}
        result={part.lastResult ?? null}
        studentLines={part.lastGradedLines ?? []}
        problem={umbrellaProblem}
        lang={lang}
      />
    </div>
    </MathInputContext.Provider>
  );
}
