"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadLang, type Lang, t } from "@/lib/i18n";
import PartCard from "@/components/PartCard";
import type { Part } from "@/lib/exercise";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  // A single pre-loaded sandbox exercise for trial
  const [sandboxPart, setSandboxPart] = useState<Part>({
    id: "sandbox-part",
    label: "",
    subPrompt: "",
    linesText: "f'(x) = cos(x^2)",
    lastResult: null,
    lastGradedLines: [],
    strokes: null,
  });

  useEffect(() => {
    setLang(loadLang());
    setReady(true);
  }, []);

  const isRtl = lang === "he";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f8f9fa] text-on-surface flex flex-col justify-between pb-12"
    >
      {/* Hero section */}
      <section className="mx-auto max-w-5xl px-5 pt-8 sm:pt-16 space-y-8 text-center flex flex-col items-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary animate-pulse shadow-sm">
          <span className="material-symbols-outlined text-sm font-bold">star</span>
          <span>{isRtl ? "סביבת הלימודים המושלמת להנדסה" : "The Ultimate Engineering Study Environment"}</span>
        </div>

        {/* Hero Title */}
        <h1 className="note-title text-4xl sm:text-6xl font-black text-on-surface leading-tight tracking-tight max-w-3xl">
          {isRtl ? (
            <>
              כתוב מתמטיקה בכתב יד. <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                מצא איפה טעית, ותקן.
              </span>
            </>
          ) : (
            <>
              Write Math by Hand. <br />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Find where you went wrong.
              </span>
            </>
          )}
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          {isRtl
            ? "MathPad מספקת משוב מיידי שורה אחר שורה על פתרונות מתמטיקה ופיזיקה. בדיקה מבוססת AI, נוסחאות מובנות וסימולטור מבחנים."
            : "MathPad gives engineering students step-by-step grading on hand-written calculus, algebra, and physics. Harness Leitner retention and exam simulation."}
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/notebooks"
            className="ai-glow inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-secondary shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined font-bold">arrow_forward</span>
            <span>{isRtl ? "כניסה לאזור הלימוד" : "Enter Study Hub"}</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-6 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-high hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            <span>{isRtl ? "התחברות לחשבון" : "Sign In"}</span>
          </Link>
        </div>
      </section>

      {/* Showcase / Sandbox */}
      <section className="mx-auto max-w-3xl w-full px-5 pt-12 space-y-4">
        <div className="text-center">
          <h2 className="note-title text-2xl font-bold text-on-surface">
            {isRtl ? "נסה בעצמך (ארגז חול)" : "Try it Yourself (Sandbox)"}
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {isRtl
              ? "פתור את הנגזרת למטה בכתב יד או בהקלדה ובדוק את עצמך:"
              : "Solve the derivative below by handwriting or typing, then tap Check:"}
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-md overflow-hidden">
          <div className="border-b border-outline-variant/40 bg-surface-container-low/60 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-bold">
                1
              </span>
              <span>{isRtl ? "שאלה לדוגמה" : "Sample Exercise"}</span>
            </span>
          </div>

          {/* Problem */}
          <div className="px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low/20">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block mb-1">
              {t("question", lang)}
            </span>
            <div className="text-lg font-bold text-on-surface" dir="ltr">
              Differentiate f(x) = sin(x²)
            </div>
          </div>

          {/* PartCard */}
          <div className="p-4 bg-[#fffefd]">
            <PartCard
              part={sandboxPart}
              partIndex={0}
              totalParts={1}
              umbrellaProblem="Differentiate f(x) = sin(x²)"
              contextFromPrev=""
              lang={lang}
              onChange={setSandboxPart}
            />
          </div>
        </div>
      </section>

      {/* Features highlight grid */}
      <section className="mx-auto max-w-5xl px-5 pt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined">folder</span>
          </div>
          <h3 className="note-title text-xl font-bold text-on-surface">
            {isRtl ? "מחברות קורסים" : "Course Notebooks"}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isRtl
              ? "סדר את התרגילים לפי קורסים (אינפי, אלגברה לינארית, פיזיקה). הכל מסונכרן לענן באופן מאובטח."
              : "Organize your calculations and assignments into clean notebooks by course. Everything is securely synced."}
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <span className="material-symbols-outlined">school</span>
          </div>
          <h3 className="note-title text-xl font-bold text-on-surface">
            {isRtl ? "כרטיסיות לשינון" : "Spaced Repetition"}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isRtl
              ? "טעית בתרגיל? הוסף אותו בלחיצה אחת לחפיסת הלייטרנר כדי לחזור עליו בדיוק בזמן הנכון."
              : "Made a mistake? Add it directly to your Leitner deck to review it at mathematically optimal intervals."}
          </p>
        </div>

        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <h3 className="note-title text-xl font-bold text-on-surface">
            {isRtl ? "סימולטור מבחנים" : "Exam Simulator"}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isRtl
              ? "התכונן למבחנים עם סימולציה מוגבלת בזמן. פתור מספר שאלות וקבל ציון ופירוט שגיאות רק בסוף."
              : "Prepare with timed mock exams. Solve multiple problems, manage your time, and receive your grade at the end."}
          </p>
        </div>
      </section>
    </div>
  );
}
