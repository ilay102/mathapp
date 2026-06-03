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
      className="min-h-screen bg-[#f8f9fa] text-on-surface flex flex-col justify-between pb-16 relative overflow-hidden"
    >
      {/* Decorative background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-3xl pointer-events-none" />

      {/* Hero section */}
      <section className="mx-auto max-w-5xl px-5 pt-12 sm:pt-20 space-y-8 text-center flex flex-col items-center relative z-10">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-outline-variant/30 px-4.5 py-2 text-xs font-bold text-primary shadow-sm hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-sm font-bold animate-pulse text-secondary">grade</span>
          <span>{isRtl ? "סביבת הלימודים המושלמת להנדסה" : "The Ultimate Engineering Study Environment"}</span>
        </div>

        {/* Hero Title */}
        <h1 className="note-title text-4xl sm:text-7xl font-black text-on-surface leading-tight tracking-tight max-w-4xl">
          {isRtl ? (
            <>
              כתוב מתמטיקה בכתב יד. <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-purple-600 bg-clip-text text-transparent">
                מצא איפה טעית, ותקן.
              </span>
            </>
          ) : (
            <>
              Write Math by Hand. <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-purple-600 bg-clip-text text-transparent">
                Find where you went wrong.
              </span>
            </>
          )}
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed font-medium">
          {isRtl
            ? "MathPad מספקת משוב מיידי שורה אחר שורה על פתרונות מתמטיקה ופיזיקה. בדיקה מבוססת AI, נוסחאות מובנות וסימולטור מבחנים."
            : "MathPad gives engineering students step-by-step grading on handwritten calculus, algebra, and physics. Harness Leitner retention, mock exams, and coordinates visualizers."}
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/notebooks"
            className="ai-glow inline-flex items-center gap-2 rounded-full px-10 py-4 text-sm font-bold text-secondary shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined font-bold">arrow_forward</span>
            <span>{isRtl ? "כניסה לאזור הלימוד" : "Enter Study Hub"}</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container px-7 py-4 text-sm font-bold text-on-surface hover:bg-surface-container-high hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">login</span>
            <span>{isRtl ? "התחברות לחשבון" : "Sign In"}</span>
          </Link>
        </div>
      </section>

      {/* Showcase / Sandbox */}
      <section className="mx-auto max-w-4xl w-full px-5 pt-16 space-y-6 relative z-10">
        <div className="text-center space-y-1">
          <h2 className="note-title text-3xl font-extrabold text-on-surface">
            {isRtl ? "נסה בעצמך (ארגז חול)" : "Interactive trial sandbox"}
          </h2>
          <p className="text-xs text-on-surface-variant max-w-lg mx-auto leading-relaxed">
            {isRtl
              ? "פתור את הנגזרת למטה בכתב יד או בהקלדה ובדוק את עצמך:"
              : "Try writing or typing a derivation step-by-step below, then tap check to diagnose mistakes:"}
          </p>
        </div>

        <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
          <div className="border-b border-outline-variant/30 bg-surface-container-low/50 px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold shadow-sm">
                1
              </span>
              <span>{isRtl ? "שאלה לדוגמה" : "Sample Exercise"}</span>
            </span>
          </div>

          {/* Problem */}
          <div className="px-6 py-5 border-b border-outline-variant/20 bg-surface-container-low/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1">
              {t("question", lang)}
            </span>
            <div className="text-xl font-bold text-on-surface" dir="ltr">
              Differentiate <span className="font-serif italic font-medium text-primary">f(x) = sin(x²)</span>
            </div>
          </div>

          {/* PartCard */}
          <div className="p-6 bg-surface-container-lowest">
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
      <section className="mx-auto max-w-5xl px-5 pt-20 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <FeatureHighlightCard
          icon="folder"
          title={isRtl ? "מחברות קורסים" : "Course Notebooks"}
          desc={isRtl 
            ? "סדר את התרגילים לפי קורסים (אינפי, אלגברה לינארית, פיזיקה). הכל מסונכרן לענן באופן מאובטח." 
            : "Organize your calculations and homework assignments into courses. Everything is securely stored."}
          accentColor="from-blue-500 to-indigo-600"
        />
        <FeatureHighlightCard
          icon="school"
          title={isRtl ? "כרטיסיות לשינון" : "Spaced Repetition"}
          desc={isRtl 
            ? "טעית בתרגיל? הוסף אותו בלחיצה אחת לחפיסת הלייטרנר כדי לחזור עליו בדיוק בזמן הנכון." 
            : "Made a mistake? Add it directly to your Leitner practice deck to review it at mathematically optimal intervals."}
          accentColor="from-purple-500 to-pink-600"
        />
        <FeatureHighlightCard
          icon="assignment"
          title={isRtl ? "סימולטור מבחנים" : "Exam Simulator"}
          desc={isRtl 
            ? "התכונן למבחנים עם סימולציה מוגבלת בזמן. פתור מספר שאלות וקבל ציון ופירוט שגיאות רק בסוף." 
            : "Prepare under timed conditions. Solve multiple problems, manage your time, and receive your comprehensive grade report at the end."}
          accentColor="from-orange-500 to-red-600"
        />
      </section>
    </div>
  );
}

function FeatureHighlightCard({ icon, title, desc, accentColor }: { icon: string; title: string; desc: string; accentColor: string }) {
  return (
    <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentColor} text-white shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <h3 className="note-title text-xl font-bold text-on-surface">
        {title}
      </h3>
      <p className="text-xs text-on-surface-variant leading-relaxed mt-2.5 font-medium">
        {desc}
      </p>
    </div>
  );
}
