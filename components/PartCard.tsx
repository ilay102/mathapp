"use client";

import { useEffect, useRef, useState } from "react";
import CheckResult, { type CheckResultData } from "./CheckResult";
import MathCanvas, { type MathCanvasHandle } from "./MathCanvas";
import MathPalette from "./MathPalette";
import type { Part } from "@/lib/exercise";
import { type Lang, t } from "@/lib/i18n";

function dataURLtoBlob(dataURL: string): Blob {
  const [header, b64] = dataURL.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
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
  const [appendMode, setAppendMode] = useState<boolean>(false);
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
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  const showLabel = totalParts > 1 || part.label || part.subPrompt;

  return (
    <div
      ref={cardRef}
      className={
        "rounded-xl border bg-surface-container-low/30 " +
        (totalParts > 1
          ? "border-outline-variant/50"
          : "border-transparent bg-transparent")
      }
    >
      {showLabel && (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-outline-variant/30">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary text-xs font-bold">
            {part.label || partIndex + 1}
          </span>
          <input
            type="text"
            value={part.subPrompt}
            onChange={(e) => update({ subPrompt: e.target.value })}
            placeholder={t("subPromptPh", lang)}
            className="flex-1 bg-transparent text-sm note-title text-on-surface placeholder:text-outline focus:outline-none"
            dir="auto"
          />
          {totalParts > 1 && onRemove && (
            <button
              onClick={onRemove}
              className="text-on-surface-variant hover:text-error"
              title={t("removePart", lang)}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      )}

      {/* Write / Type tabs */}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {t("yourWork", lang)}
          </div>
          <div className="inline-flex rounded-full bg-surface-container p-0.5 text-xs">
            <button
              onClick={() => setInputMode("write")}
              className={"flex items-center gap-1 rounded-full px-3 py-1 transition-colors " +
                (inputMode === "write" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50")}
            >
              <span className="material-symbols-outlined text-sm">edit</span> {t("write", lang)}
            </button>
            <button
              onClick={() => setInputMode("type")}
              className={"flex items-center gap-1 rounded-full px-3 py-1 transition-colors " +
                (inputMode === "type" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50")}
            >
              <span className="material-symbols-outlined text-sm">keyboard</span> {t("type", lang)}
            </button>
          </div>
        </div>

        {inputMode === "write" && (
          <div className="space-y-2">
            {/* Pen toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-full bg-surface-container px-2 py-1.5">
              <div className="flex items-center gap-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setPenColor(c.value)}
                    className={"h-6 w-6 rounded-full border-2 transition-all " +
                      (penColor === c.value ? "border-on-surface scale-110" : "border-transparent")}
                    style={{ backgroundColor: c.value }}
                    aria-label={`${c.name} pen`}
                  />
                ))}
              </div>
              <div className="h-5 w-px bg-outline-variant" />
              <div className="flex items-center gap-1">
                {PEN_SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setPenSize(s.value)}
                    className={"flex h-6 w-6 items-center justify-center rounded-full transition-all " +
                      (penSize === s.value ? "bg-white shadow-sm" : "hover:bg-white/60")}
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
                <span className="material-symbols-outlined text-sm">ink_eraser</span> {t("clear", lang)}
              </button>
            </div>

            <div className="ruled-paper relative rounded-lg border border-outline-variant/40 shadow-inner overflow-hidden">
              <MathCanvas ref={canvasRef} height={240} color={penColor} size={penSize} initialStrokes={part.strokes || []} onChange={(strokes) => update({ strokes })} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={readHandwriting} disabled={ocrLoading}
                className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary-fixed/80 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                {ocrLoading ? t("reading", lang) : t("previewReading", lang)}
              </button>
              <label className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
                <input type="checkbox" checked={appendMode} onChange={(e) => setAppendMode(e.target.checked)} className="accent-primary" />
                {t("appendDontReplace", lang)}
              </label>
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

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-on-surface-variant">
              {inputMode === "write" ? t("whatWellGrade", lang) : t("oneStepPerLine", lang)}
            </div>
            {(part.linesText.trim() || part.lastResult) && (
              <button
                onClick={startFresh}
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 text-[11px] font-medium text-on-surface-variant hover:bg-error-container hover:text-on-error-container hover:border-error/40 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                {t("startFresh", lang)}
              </button>
            )}
          </div>
          {inputMode === "type" && (
            <div className="mb-2">
              <MathPalette onSelectSymbol={insertAtCursor} />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={part.linesText}
            onChange={(e) => update({ linesText: e.target.value })}
            onFocus={onFocus}
            rows={inputMode === "write" ? 3 : 5}
            className="handwritten w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-3 text-xl leading-relaxed text-on-surface focus:border-primary focus:outline-none"
            placeholder={inputMode === "write" ? "" : "Step 1…\nStep 2…\nStep 3…"}
            dir="auto"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={check} disabled={loading}
            className="ai-glow inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-secondary disabled:text-on-surface-variant">
            <span className="material-symbols-outlined">{loading ? "hourglass_top" : "plagiarism"}</span>
            {loading ? t("checking", lang) : t("showAllMistakes", lang)}
          </button>
          <span className="text-xs text-outline">Ctrl + Enter</span>
          {error && (
            <span className="text-sm text-error">
              <span className="material-symbols-outlined align-middle text-sm">error</span> {error}
            </span>
          )}
        </div>

        {part.lastResult && (
          <CheckResult
            result={part.lastResult}
            studentLines={part.lastGradedLines ?? []}
            problem={umbrellaProblem}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}
