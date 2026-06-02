"use client";

import { useMemo, useRef, useState } from "react";
import PartCard from "./PartCard";
import { type Exercise, type Part, newPart, nextLabel } from "@/lib/exercise";
import { type Lang, t } from "@/lib/i18n";

function dataURLtoBlob(dataURL: string): Blob {
  const [header, b64] = dataURL.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function ExerciseCard({
  exercise,
  index,
  lang = "en",
  onChange,
  onRemove,
}: {
  exercise: Exercise;
  index: number;
  lang?: Lang;
  onChange: (next: Exercise) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrErr, setOcrErr] = useState<string | null>(null);

  const update = (patch: Partial<Exercise>) => onChange({ ...exercise, ...patch });
  const updatePart = (id: string, next: Part) =>
    update({ parts: exercise.parts.map((p) => (p.id === id ? next : p)) });
  const removePart = (id: string) =>
    update({ parts: exercise.parts.filter((p) => p.id !== id).length
      ? exercise.parts.filter((p) => p.id !== id)
      : [newPart()] });

  function addPart() {
    const label = nextLabel(exercise.parts);
    update({ parts: [...exercise.parts, { ...newPart(label) }] });
  }

  async function attachImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => update({ problemImage: String(reader.result) });
    reader.readAsDataURL(file);
  }

  // Resolve the umbrella problem text (run image OCR once-per-edit on demand).
  const [imageOcrText, setImageOcrText] = useState<string | null>(null);
  const [imageOcrLoading, setImageOcrLoading] = useState(false);
  async function ocrProblemImage() {
    if (!exercise.problemImage) return null;
    if (imageOcrText) return imageOcrText;
    setImageOcrLoading(true);
    try {
      const blob = dataURLtoBlob(exercise.problemImage);
      const fd = new FormData();
      fd.append("file", blob, "problem.png");
      fd.append("mode", "problem");
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const json = await res.json();
      if (json.ok && Array.isArray(json.lines)) {
        const txt = json.lines.join(" ").trim();
        setImageOcrText(txt);
        return txt;
      }
    } catch (e) {
      setOcrErr(e instanceof Error ? e.message : String(e));
    } finally {
      setImageOcrLoading(false);
    }
    return null;
  }

  // Compute "context from previous verified parts" for a given part index.
  function contextFor(partIdx: number): string {
    const earlier = exercise.parts.slice(0, partIdx);
    const verified = earlier
      .map((p) => {
        const r = p.lastResult;
        if (!r || r.status !== "correct") return null;
        const label = p.label ? `(${p.label})` : `step ${earlier.indexOf(p) + 1}`;
        const lines = (p.lastGradedLines ?? []).map((l) => `  ${l}`).join("\n");
        return `${label}\n${lines}`;
      })
      .filter(Boolean) as string[];
    if (verified.length === 0) return "";
    const header = `${t("context", lang)} (${t("fromPrev", lang)}):`;
    return `${header}\n${verified.join("\n")}`;
  }

  // Build the umbrella problem string (text + ocr'd image if needed).
  const [umbrella, setUmbrella] = useState<string>("");
  useMemo(() => {
    const text = exercise.problemText.trim();
    if (text) { setUmbrella(text); return; }
    if (exercise.problemImage && imageOcrText) { setUmbrella(imageOcrText); return; }
    setUmbrella("");
  }, [exercise.problemText, exercise.problemImage, imageOcrText]);

  // Trigger OCR lazily when image exists but text doesn't and OCR hasn't run
  useMemo(() => {
    if (exercise.problemImage && !exercise.problemText.trim() && !imageOcrText && !imageOcrLoading) {
      ocrProblemImage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.problemImage, exercise.problemText, imageOcrText]);

  const hasMultipleParts = exercise.parts.length > 1;

  return (
    <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm overflow-hidden">
      <header className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-sm">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-on-surface">
            {lang === "he" ? "תרגיל" : "Exercise"} {index + 1}
            {hasMultipleParts && (
              <span className="ml-2 text-on-surface-variant font-normal">
                · {exercise.parts.length} {lang === "he" ? "סעיפים" : "parts"}
              </span>
            )}
          </span>
        </div>
        <button onClick={onRemove} className="text-on-surface-variant hover:text-error transition-colors" title={lang === "he" ? "הסר תרגיל" : "Remove exercise"}>
          <span className="material-symbols-outlined">delete_outline</span>
        </button>
      </header>

      {/* Umbrella question */}
      <section className="border-b border-outline-variant/30 px-5 py-4 space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {t("question", lang)}
        </div>
        {exercise.problemImage && (
          <div className="relative">
            <img src={exercise.problemImage} alt="" className="max-h-[280px] w-auto rounded-md border border-outline-variant/40" />
            <button
              onClick={() => { update({ problemImage: null }); setImageOcrText(null); }}
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1 text-on-surface-variant shadow hover:text-error"
              title={lang === "he" ? "הסר תמונה" : "Remove screenshot"}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            {imageOcrLoading && (
              <div className="mt-1 text-[11px] text-on-surface-variant">{t("reading", lang)}</div>
            )}
          </div>
        )}
        <textarea
          value={exercise.problemText}
          onChange={(e) => { update({ problemText: e.target.value }); }}
          rows={2}
          className="w-full resize-none bg-transparent text-lg note-title text-on-surface placeholder:text-outline focus:outline-none"
          placeholder={exercise.problemImage ? t("problemPlaceholderWithImage", lang) : t("problemPlaceholder", lang)}
          dir="auto"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) attachImage(f); e.target.value = ""; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
            {exercise.problemImage ? t("replaceScreenshot", lang) : t("uploadScreenshot", lang)}
          </button>
          {ocrErr && <span className="text-xs text-error">{ocrErr}</span>}
        </div>
      </section>

      {/* Parts */}
      <div className="space-y-3 p-5">
        {exercise.parts.map((p, i) => (
          <PartCard
            key={p.id}
            part={p}
            partIndex={i}
            totalParts={exercise.parts.length}
            umbrellaProblem={umbrella}
            contextFromPrev={contextFor(i)}
            lang={lang}
            onChange={(next) => updatePart(p.id, next)}
            onRemove={exercise.parts.length > 1 ? () => removePart(p.id) : undefined}
          />
        ))}

        <button
          onClick={addPart}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-outline-variant px-4 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container hover:text-primary hover:border-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {t("addPart", lang)}
        </button>
      </div>
    </article>
  );
}
