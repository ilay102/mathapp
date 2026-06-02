"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { loadLang, type Lang } from "@/lib/i18n";
import MathCanvas, { type MathCanvasHandle } from "@/components/MathCanvas";
import MathPalette from "@/components/MathPalette";
import CheckResult, { type CheckResultData } from "@/components/CheckResult";
import { applyVerdict, loadDeck, saveDeck, newCard, type DeckCard } from "@/lib/practice";

type ExamQuestion = {
  id: string;
  problem: string;
  expectedTechnique: string;
  points: number;
  // Student answer state
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

      // Start countdown
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

  // Save current active question handwriting strokes
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

  // Auto OCR on handwriting strokes if in write mode
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

  // Triggers when timer expires
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
      // Sync strokes of currently active card first
      if (!isAuto) syncStrokes();

      const gradedQuestions = [...questions];

      // Perform OCR for all handwritten answers and Grade line-by-line
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

        // Call the check API
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
          // partial credit: check how many correct lines relative to errors
          const totalGraded = q.answerLines.split("\n").filter(Boolean).length;
          const errorsCount = q.result.errors?.length ?? 0;
          const pct = Math.max(0, (totalGraded - errorsCount) / Math.max(1, totalGraded));
          scoredPoints += Math.round(q.points * pct * 0.4); // maximum 40% partial credit for wrong answers
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

  // Format countdown string
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Rendering Helper: Active Question Form
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
      <div className="space-y-4">
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-secondary-container text-on-secondary px-3 py-1 text-xs font-bold">
            {isRtl
              ? `שאלה ${activeQIndex + 1} מתוך ${questions.length} · ${q.points} נקודות`
              : `Question ${activeQIndex + 1} of ${questions.length} · ${q.points} points`}
          </span>

          <div className="inline-flex rounded-full bg-surface-container p-0.5 text-xs">
            <button
              onClick={() => {
                syncStrokes();
                setQuestions((prev) =>
                  prev.map((item, idx) =>
                    idx === activeQIndex ? { ...item, inputMode: "write" } : item
                  )
                );
              }}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                q.inputMode === "write" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50"
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
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                q.inputMode === "type" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/50"
              }`}
            >
              <span className="material-symbols-outlined text-sm">keyboard</span>
              <span>{isRtl ? "הקלדה" : "Type"}</span>
            </button>
          </div>
        </div>

        {/* Problem Card */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low/40 p-5 text-lg font-medium text-on-surface" dir="auto">
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
          <div className="space-y-3">
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
              className="handwritten w-full resize-y rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 text-xl leading-relaxed text-on-surface focus:border-primary focus:outline-none"
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
      className="mx-auto max-w-4xl p-5 sm:p-8 space-y-6 min-h-screen pb-24"
    >
      {/* STAGE 1: CONFIGURATION */}
      {stage === "config" && (
        <section className="max-w-xl mx-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
              <span className="material-symbols-outlined text-3xl font-bold">assignment</span>
            </div>
            <h1 className="note-title text-3xl font-extrabold text-on-surface">
              {isRtl ? "סימולטור מבחנים" : "Exam Simulator"}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isRtl
                ? "בחן את עצמך בתנאי אמת. ללא רמזים או בדיקה מיידית."
                : "Test yourself under real conditions. No instant hints or checkers."}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-xs text-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                {isRtl ? "נושא המבחן" : "Subject"}
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as any)}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="calculus">{isRtl ? "חשבון אינפיניטסימלי (חדו\"א)" : "Calculus"}</option>
                <option value="linear_algebra">{isRtl ? "אלגברה ליניארית" : "Linear Algebra"}</option>
                <option value="diffeq">{isRtl ? "משוואות דיפרנציאליות (מד\"ר)" : "ODEs"}</option>
                <option value="physics">{isRtl ? "פיזיקה קלאסית" : "Physics"}</option>
              </select>
            </div>

            {/* Questions length */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                {isRtl ? "כמות שאלות" : "Number of questions"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                      questionCount === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-outline">
                {isRtl ? "הגבלת זמן (דקות)" : "Time limit (minutes)"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDuration(t)}
                    className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                      duration === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
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
            className="ai-glow w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-secondary disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            <span>{loadingQuestions ? (isRtl ? "מייצר מבחן..." : "Generating Exam...") : (isRtl ? "התחל מבחן" : "Start Exam")}</span>
          </button>
        </section>
      )}

      {/* STAGE 2: ACTIVE EXAM */}
      {stage === "active" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-4">
            {/* Timer card */}
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 text-center shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
                {isRtl ? "זמן נותר" : "Time remaining"}
              </div>
              <div
                className={`text-3xl font-black ${
                  timeLeft < 300 ? "text-error animate-pulse" : "text-on-surface"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Questions lists tabs */}
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-sm flex flex-row lg:flex-col overflow-x-auto gap-2 lg:overflow-x-visible">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    syncStrokes();
                    setActiveQIndex(idx);
                  }}
                  className={`rounded-xl px-4 py-2.5 text-xs font-semibold shrink-0 lg:shrink text-right transition-colors ${
                    activeQIndex === idx
                      ? "bg-primary text-on-primary font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {isRtl ? `שאלה ${idx + 1}` : `Question ${idx + 1}`}
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={() => submitExam()}
              disabled={grading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-bold text-white hover:bg-black/90 disabled:opacity-50 shadow-md"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{grading ? (isRtl ? "בודק פתרונות..." : "Grading answers...") : (isRtl ? "הגש מבחן" : "Submit Exam")}</span>
            </button>
          </div>

          {/* Active Question Panel */}
          <div className="lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 sm:p-6 shadow-md">
            {renderActiveQuestion()}
          </div>
        </div>
      )}

      {/* STAGE 3: EXAM REPORT */}
      {stage === "report" && examResult && (
        <section className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8 shadow-md text-center space-y-4">
            <h1 className="note-title text-3xl font-extrabold text-on-surface">
              {isRtl ? "סיכום תוצאות המבחן" : "Exam Results Summary"}
            </h1>
            <div className="flex flex-col items-center justify-center">
              <div
                className={`text-6xl font-black ${
                  examResult.score / examResult.totalPoints >= 0.75 ? "text-green-600" : "text-error"
                }`}
              >
                {examResult.score}/{examResult.totalPoints}
              </div>
              <span className="text-xs text-outline mt-1 font-semibold uppercase tracking-wider">
                {isRtl ? "ציון סופי במבחן" : "Final Mock Score"}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setStage("config")}
                className="rounded-xl border border-outline-variant px-5 py-2 text-xs font-semibold hover:bg-surface-container transition-colors"
              >
                {isRtl ? "נסה סימולציה חדשה" : "Start New Simulator"}
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition-colors"
              >
                {isRtl ? "חזרה ללוח בקרה" : "Back to Dashboard"}
              </Link>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-6">
            <h2 className="note-title text-2xl font-bold text-on-surface">
              {isRtl ? "סקירת פתרונות מפורטת" : "Detailed Solutions Review"}
            </h2>

            {examResult.questions.map((q, idx) => {
              const status = q.result?.status;
              const isCorrect = status === "correct";

              return (
                <article
                  key={q.id}
                  className={`rounded-2xl border bg-surface-container-lowest p-5 sm:p-6 shadow-sm space-y-4 ${
                    isCorrect ? "border-green-500/30" : "border-red-500/30"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="rounded bg-secondary-container text-on-secondary px-2.5 py-0.5 text-[10px] font-bold">
                        {isRtl ? `שאלה ${idx + 1}` : `Question ${idx + 1}`}
                      </span>
                      <h3 className="text-sm font-bold text-on-surface" dir="auto">
                        {q.problem}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          isCorrect
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isCorrect ? (isRtl ? "נכון" : "Correct") : (isRtl ? "שגיאה" : "Incorrect")}
                      </span>
                      <button
                        onClick={() => addToSpacedRep(q.problem, q.expectedTechnique)}
                        className="rounded border border-outline-variant/60 bg-surface-container-low px-2 py-1 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">school</span>
                        <span>{isRtl ? "הוסף לשינון" : "Add to practice"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Student Answer */}
                  <div className="space-y-1 border-t border-outline-variant/20 pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-outline">
                      {isRtl ? "התשובה שהגשת" : "Your submitted answer"}
                    </h4>
                    <pre className="handwritten rounded-lg bg-surface-container-low/40 p-3 text-lg leading-relaxed text-on-surface overflow-x-auto">
                      {q.answerLines || (isRtl ? "(אין פתרון)" : "(Empty solution)")}
                    </pre>
                  </div>

                  {/* Grading CheckResult */}
                  {q.result && (
                    <div className="border-t border-outline-variant/20 pt-3">
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
