"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { loadLang, type Lang } from "@/lib/i18n";
import MathCanvas, { type MathCanvasHandle } from "@/components/MathCanvas";
import MathPalette from "@/components/MathPalette";
import CheckResult, { type CheckResultData } from "@/components/CheckResult";
import { applyVerdict, loadDeck, saveDeck, newCard } from "@/lib/practice";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

type ExamQuestion = {
  id: string;
  problem: string;
  expectedTechnique: string;
  points: number;
  answerLines: string;
  result?: CheckResultData | null;
  strokes?: any[] | null;
  inputMode: "write" | "type";
};

type ExamResult = {
  score: number;
  totalPoints: number;
  questions: ExamQuestion[];
};

export default function ExamSimulatorPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState<"config" | "active" | "report">("config");

  // Configuration state
  const [topic, setTopic] = useState<"calculus" | "linear_algebra" | "diffeq" | "physics">("calculus");
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [duration, setDuration] = useState<number>(30); // in minutes

  // Active exam state
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [grading, setGrading] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRefs = useRef<Record<string, MathCanvasHandle | null>>({});

  useEffect(() => {
    setLang(loadLang());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isRtl = lang === "he";

  // Starts the exam session
  async function startExam() {
    setLoadingQuestions(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, n: questionCount, language: lang }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to generate exam questions");

      const loadedQ: ExamQuestion[] = json.questions.map((q: any) => ({
        ...q,
        answerLines: "",
        inputMode: "write",
        strokes: null,
      }));

      setQuestions(loadedQ);
      setActiveQIndex(0);
      setTimeLeft(duration * 60);
      setStage("active");

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            autoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingQuestions(false);
    }
  }

  // Save active question handwriting strokes
  function syncStrokes() {
    const currentQ = questions[activeQIndex];
    if (!currentQ) return;
    const canvas = canvasRefs.current[currentQ.id];
    if (canvas) {
      const strokes = canvas.getStrokes();
      setQuestions((prev) =>
        prev.map((q, idx) => (idx === activeQIndex ? { ...q, strokes } : q))
      );
    }
  }

  // Auto OCR on handwriting strokes
  async function performOcr(q: ExamQuestion): Promise<string> {
    const canvas = canvasRefs.current[q.id];
    const strokes = q.strokes || canvas?.getStrokes() || [];
    if (q.inputMode === "write" && strokes.length > 0) {
      const png = canvas?.exportPNG();
      if (png) {
        const blob = await fetch(png).then((r) => r.blob());
        const fd = new FormData();
        fd.append("file", blob, "answer.png");
        const res = await fetch("/api/ocr", { method: "POST", body: fd });
        const ocrJson = await res.json();
        if (ocrJson.ok && Array.isArray(ocrJson.lines)) {
          return ocrJson.lines.filter(Boolean).join("\n");
        }
      }
    }
    return q.answerLines;
  }

  async function autoSubmit() {
    alert(isRtl ? "נגמר הזמן! מגיש את המבחן אוטומטית..." : "Time is up! Submitting your exam automatically...");
    await submitExam(true);
  }

  // Grade whole exam
  async function submitExam(isAuto = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    setGrading(true);
    setError(null);

    try {
      if (!isAuto) syncStrokes();

      const gradedQuestions = [...questions];

      // Perform OCR for all handwritten answers and grade
      for (let i = 0; i < gradedQuestions.length; i++) {
        const q = gradedQuestions[i];
        const studentText = await performOcr(q);
        const studentLines = studentText.split("\n").map((s) => s.trim()).filter(Boolean);

        if (studentLines.length === 0) {
          gradedQuestions[i] = {
            ...q,
            answerLines: studentText,
            result: {
              status: "incomplete",
              confidence: 1,
              errors: [],
              finalAnswer: "",
              domain: null,
              technique: q.expectedTechnique,
              graphExpr: null,
              graphRange: null,
              studentExpr: null,
              integralRange: null,
              workedSolution: null,
              uncertainty: isRtl ? "לא הוגש פתרון לשאלה זו." : "No solution was submitted for this question.",
            },
          };
          continue;
        }

        const res = await fetch("/api/check-work", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ problem: q.problem, studentLines, language: lang }),
        });
        const json = await res.json();

        gradedQuestions[i] = {
          ...q,
          answerLines: studentText,
          result: json.ok ? json.result : null,
        };
      }

      // Calculate score
      let scoredPoints = 0;
      let totalPoints = 0;

      for (const q of gradedQuestions) {
        totalPoints += q.points;
        if (q.result?.status === "correct") {
          scoredPoints += q.points;
        } else if (q.result?.status === "wrong") {
          const totalGraded = q.answerLines.split("\n").filter(Boolean).length;
          const errorsCount = q.result.errors?.length ?? 0;
          const pct = Math.max(0, (totalGraded - errorsCount) / Math.max(1, totalGraded));
          scoredPoints += Math.round(q.points * pct * 0.4); // max 40% partial credit
        }
      }

      setExamResult({
        score: scoredPoints,
        totalPoints,
        questions: gradedQuestions,
      });
      setStage("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGrading(false);
    }
  }

  // Spaced Repetition insertion helper
  const addToSpacedRep = (problem: string, technique: string) => {
    try {
      const deck = loadDeck();
      const exists = deck.some((c) => c.problem === problem);
      if (exists) return;

      const card = newCard(problem, technique, null, "generated");
      card.level = 1;
      saveDeck([card, ...deck]);
      alert(isRtl ? "התווסף לחפיסה לשינון!" : "Added to your practice deck!");
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderActiveQuestion = () => {
    const q = questions[activeQIndex];
    if (!q) return null;

    const insertSymbol = (sym: string) => {
      const currentVal = q.answerLines;
      const nextVal = currentVal + sym;
      setQuestions((prev) =>
        prev.map((item, idx) => (idx === activeQIndex ? { ...item, answerLines: nextVal } : item))
      );
    };

    return (
      <div className="space-y-6">
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <span className="rounded-full bg-secondary-container/15 text-secondary px-4 py-1.5 text-xs font-bold border border-secondary/20">
            {isRtl
              ? `שאלה ${activeQIndex + 1} מתוך ${questions.length} · ${q.points} נקודות`
              : `Question ${activeQIndex + 1} of ${questions.length} · ${q.points} points`}
          </span>

          <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline-variant/30">
            <button
              onClick={() => {
                syncStrokes();
                setQuestions((prev) =>
                  prev.map((item, idx) =>
                    idx === activeQIndex ? { ...item, inputMode: "write" } : item
                  )
                );
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                q.inputMode === "write" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>{isRtl ? "כתיבה" : "Write"}</span>
            </button>
            <button
              onClick={() => {
                syncStrokes();
                setQuestions((prev) =>
                  prev.map((item, idx) =>
                    idx === activeQIndex ? { ...item, inputMode: "type" } : item
                  )
                );
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                q.inputMode === "type" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-sm">keyboard</span>
              <span>{isRtl ? "הקלדה" : "Type"}</span>
            </button>
          </div>
        </div>

        {/* Problem Card */}
        <div className="rounded-2xl border border-outline-variant/50 bg-[#fffdf7] p-5 note-title text-xl font-bold text-on-surface shadow-sm" dir="auto">
          {q.problem}
        </div>

        {/* Inputs */}
        {q.inputMode === "write" ? (
          <div className="ruled-paper relative rounded-2xl border border-outline-variant/40 shadow-inner overflow-hidden">
            <MathCanvas
              ref={(el) => {
                canvasRefs.current[q.id] = el;
              }}
              height={320}
              initialStrokes={q.strokes || []}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <MathPalette onSelectSymbol={insertSymbol} />
            <textarea
              value={q.answerLines}
              onChange={(e) =>
                setQuestions((prev) =>
                  prev.map((item, idx) =>
                    idx === activeQIndex ? { ...item, answerLines: e.target.value } : item
                  )
                )
              }
              rows={8}
              className="notebook-textarea w-full resize-y text-lg"
              placeholder={isRtl ? "כתוב את הפתרון שורה אחר שורה..." : "Write your steps line by line..."}
              dir="auto"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-5xl p-6 sm:p-10 space-y-6 min-h-screen pb-24 animate-fade-in"
    >
      {/* STAGE 1: CONFIGURATION */}
      {stage === "config" && (
        <section className="max-w-md mx-auto rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 mx-auto animate-pulse">
              <span className="material-symbols-outlined text-3xl font-bold">assignment</span>
            </div>
            <h1 className="note-title text-3xl font-extrabold text-on-surface">
              {isRtl ? "סימולטור מבחנים" : "Exam Simulator"}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium max-w-xs mx-auto leading-relaxed">
              {isRtl
                ? "בחן את עצמך בתנאי אמת. ללא רמזים או בדיקה מיידית."
                : "Test yourself under real exam conditions. No immediate feedback or step hints."}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error/5 p-3.5 text-xs text-error font-medium">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                {isRtl ? "נושא המבחן" : "Subject"}
              </label>
              {/* Custom select styling */}
              <div className="relative">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as any)}
                  className="w-full appearance-none rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary pr-10"
                  style={{ paddingRight: isRtl ? "1rem" : "2.5rem", paddingLeft: isRtl ? "2.5rem" : "1rem" }}
                >
                  <option value="calculus">{isRtl ? "חשבון אינפיניטסימלי (חדו\"א)" : "Calculus"}</option>
                  <option value="linear_algebra">{isRtl ? "אלגברה ליניארית" : "Linear Algebra"}</option>
                  <option value="diffeq">{isRtl ? "משוואות דיפרנציאליות (מד\"ר)" : "ODEs"}</option>
                  <option value="physics">{isRtl ? "פיזיקה קלאסית" : "Physics"}</option>
                </select>
                <div className={`pointer-events-none absolute inset-y-0 flex items-center text-outline ${isRtl ? "left-3" : "right-3"}`}>
                  <span className="material-symbols-outlined text-lg">unfold_more</span>
                </div>
              </div>
            </div>

            {/* Questions length */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                {isRtl ? "כמות שאלות" : "Number of questions"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      questionCount === n
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:scale-[1.03] active:scale-[0.97]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                {isRtl ? "הגבלת זמן" : "Time limit"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDuration(t)}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      duration === t
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:scale-[1.03] active:scale-[0.97]"
                    }`}
                  >
                    {t} {isRtl ? "דק'" : "m"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={startExam}
            disabled={loadingQuestions}
            className="ai-glow w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-secondary disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            <span>{loadingQuestions ? (isRtl ? "מייצר מבחן..." : "Generating Exam...") : (isRtl ? "התחל מבחן" : "Start Exam")}</span>
          </button>
        </section>
      )}

      {/* STAGE 2: ACTIVE EXAM */}
      {stage === "active" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Tabs (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Timer card */}
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-5 text-center shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
                {isRtl ? "זמן נותר" : "Time remaining"}
              </div>
              <div
                className={`text-4xl font-black ${
                  timeLeft < 300 ? "text-error animate-pulse" : "text-primary"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Questions lists tabs */}
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3.5 shadow-sm flex flex-row lg:flex-col overflow-x-auto gap-2 lg:overflow-x-visible">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    syncStrokes();
                    setActiveQIndex(idx);
                  }}
                  className={`rounded-xl px-4 py-3 text-xs font-bold text-start shrink-0 lg:shrink transition-all flex items-center justify-between border ${
                    activeQIndex === idx
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/15 font-extrabold"
                      : "bg-surface-container-low/40 border-outline-variant/20 hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span>{isRtl ? `שאלה ${idx + 1}` : `Question ${idx + 1}`}</span>
                  <span className={`h-2 w-2 rounded-full ml-2 ${
                    q.answerLines.trim() || q.strokes?.length ? "bg-emerald-400" : "bg-outline-variant"
                  }`} />
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={() => submitExam()}
              disabled={grading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white hover:bg-black/90 disabled:opacity-50 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{grading ? (isRtl ? "בודק פתרונות..." : "Grading answers...") : (isRtl ? "הגש מבחן" : "Submit Exam")}</span>
            </button>
          </div>

          {/* Active Question Panel (9 cols) */}
          <div className="lg:col-span-9 rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8 shadow-md">
            {renderActiveQuestion()}
          </div>
        </div>
      )}

      {/* STAGE 3: EXAM REPORT */}
      {stage === "report" && examResult && (
        <section className="space-y-8">
          {/* Summary Score Card */}
          <div className="rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8 shadow-lg text-center space-y-6 max-w-xl mx-auto relative overflow-hidden">
            {/* background blur accent */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-2">
              <h1 className="note-title text-3xl font-extrabold text-on-surface">
                {isRtl ? "סיכום תוצאות המבחן" : "Exam Results Summary"}
              </h1>
              <p className="text-xs text-on-surface-variant font-medium">
                {isRtl ? "שקלול ציונים מפורט וניתוח שגיאות" : "Calculated score and performance analytics"}
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
              <div
                className={`text-7xl font-black tracking-tight ${
                  examResult.score / examResult.totalPoints >= 0.75 ? "text-green-600" : "text-error"
                }`}
              >
                {examResult.score}/{examResult.totalPoints}
              </div>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                {isRtl ? "ציון סופי במבחן" : "Final Mock Score"}
              </span>
              <div className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-low text-on-surface mt-2">
                {examResult.score / examResult.totalPoints >= 0.9 
                  ? (isRtl ? "מצוין! שליטה מלאה בחומר" : "Outstanding! Excellent Mastery")
                  : examResult.score / examResult.totalPoints >= 0.75
                  ? (isRtl ? "עברת בהצלחה! ישנן שגיאות קלות" : "Passed! Minor mistakes found")
                  : (isRtl ? "נדרש תרגול נוסף" : "Needs Practice")}
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-4 border-t border-outline-variant/20 pt-5">
              <button
                onClick={() => setStage("config")}
                className="rounded-xl border border-outline-variant px-5 py-2.5 text-xs font-bold hover:bg-surface-container hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isRtl ? "נסה סימולציה חדשה" : "Start New Simulator"}
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isRtl ? "חזרה ללוח בקרה" : "Back to Dashboard"}
              </Link>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-6">
            <div className="border-b border-outline-variant/20 pb-3">
              <h2 className="note-title text-2xl font-bold text-on-surface">
                {isRtl ? "סקירת פתרונות מפורטת" : "Detailed Solutions Review"}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {isRtl ? "ניתוח שגיאות שורה אחר שורה ופתרונות מוצעים" : "Analyze mistakes and view canonical worked steps"}
              </p>
            </div>

            {examResult.questions.map((q, idx) => {
              const status = q.result?.status;
              const isCorrect = status === "correct";

              return (
                <article
                  key={q.id}
                  className={`rounded-3xl border bg-surface-container-lowest p-6 shadow-sm space-y-4 hover:shadow-md transition-all ${
                    isCorrect ? "border-green-500/25 bg-green-500/[0.01]" : "border-red-500/25 bg-red-500/[0.01]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap">
                    <div className="space-y-2">
                      <span className="rounded bg-secondary-container/15 text-secondary px-2.5 py-1 text-[9px] font-bold border border-secondary/20 uppercase tracking-wider inline-block">
                        {isRtl ? `שאלה ${idx + 1}` : `Question ${idx + 1}`}
                      </span>
                      <h3 className="text-base font-bold text-on-surface leading-snug" dir="auto">
                        {q.problem}
                      </h3>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 shrink-0">
                      <span
                        className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${
                          isCorrect
                            ? "bg-green-500/10 text-green-700 border border-green-500/20"
                            : "bg-red-500/10 text-red-700 border border-red-500/20"
                        }`}
                      >
                        {isCorrect ? (isRtl ? "נכון" : "Correct") : (isRtl ? "שגיאה" : "Incorrect")}
                      </span>
                      <button
                        onClick={() => addToSpacedRep(q.problem, q.expectedTechnique)}
                        className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-2.5 py-1.5 text-[9px] font-bold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined text-xs">school</span>
                        <span>{isRtl ? "הוסף לשינון" : "Add to practice"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Student Answer */}
                  <div className="space-y-1.5 border-t border-outline-variant/20 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-outline">
                      {isRtl ? "התשובה שהגשת" : "Your submitted answer"}
                    </h4>
                    <pre className="handwritten rounded-xl bg-surface-container-low/30 p-4 text-lg leading-relaxed text-on-surface overflow-x-auto border border-outline-variant/10">
                      {q.answerLines || (isRtl ? "(אין פתרון)" : "(Empty solution)")}
                    </pre>
                  </div>

                  {/* Grading CheckResult */}
                  {q.result && (
                    <div className="border-t border-outline-variant/20 pt-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-outline mb-2">
                        {isRtl ? "תוצאות בדיקה ופתרון מלא" : "Checks Results and Solution"}
                      </h4>
                      <CheckResult
                        result={q.result}
                        studentLines={q.answerLines.split("\n").filter(Boolean)}
                        problem={q.problem}
                        lang={lang}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
