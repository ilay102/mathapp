export type Lang = "en" | "he";

const dict = {
  // App chrome
  notebook: { en: "Notebook", he: "מחברת" },
  exercise: { en: "exercise", he: "תרגיל" },
  exercises: { en: "exercises", he: "תרגילים" },
  newExercise: { en: "New exercise", he: "תרגיל חדש" },
  addAnother: { en: "Add another exercise", he: "הוסף תרגיל" },
  whereWrong: { en: "where did I go wrong?", he: "איפה טעיתי?" },
  poweredBy: { en: "Powered by Lumen · grading by DeepSeek · OCR by Gemini Vision · saved locally", he: "מופעל על-ידי לומן · בדיקה: DeepSeek · OCR: Gemini · נשמר מקומית" },

  // Exercise card
  exerciseN: { en: "Exercise", he: "תרגיל" },
  question: { en: "Question", he: "שאלה" },
  uploadScreenshot: { en: "Upload screenshot", he: "העלה צילום מסך" },
  replaceScreenshot: { en: "Replace screenshot", he: "החלף צילום מסך" },
  problemPlaceholder: { en: "Type the problem here, or upload a screenshot ↓", he: "הקלד את השאלה כאן, או העלה צילום מסך ↓" },
  problemPlaceholderWithImage: { en: "Optional: type the problem too (or leave blank — AI will OCR the image)", he: "אופציונלי: הקלד את השאלה (או השאר ריק — ה-AI יקרא את התמונה)" },
  yourWork: { en: "Your work", he: "העבודה שלך" },
  write: { en: "Write", he: "כתיבה" },
  type: { en: "Type", he: "הקלדה" },
  undo: { en: "Undo", he: "בטל" },
  clear: { en: "Clear", he: "נקה" },
  previewReading: { en: "Preview reading", he: "הצג קריאה" },
  reading: { en: "Reading…", he: "קורא…" },
  appendDontReplace: { en: "Append (don't replace)", he: "הוסף (אל תחליף)" },
  autoReadHint: { en: "Just tap Show ALL my mistakes — it reads your handwriting automatically.", he: "פשוט לחץ הצג את כל הטעויות — הוא יקרא את כתב היד שלך אוטומטית." },
  staleTitle: { en: "Leftover text from before will be graded.", he: "טקסט שנשאר מקודם יבדק." },
  staleHint: { en: "If you want to start over, hit Start fresh below.", he: "אם תרצה להתחיל מחדש, לחץ התחל מחדש למטה." },
  whatWellGrade: { en: "What we'll grade — edit if the OCR got it wrong:", he: "מה נבדוק — תקן אם ה-OCR טעה:" },
  oneStepPerLine: { en: "One step per line:", he: "צעד אחד בכל שורה:" },
  startFresh: { en: "Start fresh", he: "התחל מחדש" },
  showAllMistakes: { en: "Show ALL my mistakes", he: "הצג את כל הטעויות שלי" },
  checking: { en: "Checking…", he: "בודק…" },
  writeFirst: { en: "Write your steps first.", he: "כתוב את הצעדים שלך קודם." },
  addProblem: { en: "Add a problem (text or screenshot).", he: "הוסף שאלה (טקסט או צילום מסך)." },
  writeSomething: { en: "Write something first.", he: "כתוב משהו קודם." },
  cantRead: { en: "Couldn't read any text — try writing larger.", he: "לא הצלחתי לקרוא — נסה לכתוב גדול יותר." },

  // Check result
  lumenResult: { en: "Lumen Result", he: "תוצאת לומן" },
  sure: { en: "sure", he: "בטחון" },
  problem: { en: "Problem", he: "שאלה" },
  finalAnswerShould: { en: "Final answer should be", he: "התשובה הסופית צריכה להיות" },
  everyStepChecks: { en: "Every step checks out — nice work.", he: "כל צעד מסתדר — עבודה יפה." },
  mistakeFound: { en: "mistake found", he: "טעות נמצאה" },
  mistakesFound: { en: "mistakes found", he: "טעויות נמצאו" },
  seeMarkedLines: { en: "see the marked lines below.", he: "ראה את השורות המסומנות למטה." },
  unfinished: { en: "Your solution looks unfinished.", he: "הפתרון שלך נראה לא גמור." },
  couldntRead: { en: "I couldn't read this clearly.", he: "לא הצלחתי לקרוא את זה בבירור." },
  followsFrom: { en: "This follows from line", he: "זה נובע משורה" },
  fixFirst: { en: "fix that first.", he: "תקן את זה קודם." },
  aiNote: { en: "AI Note", he: "הערת AI" },
  whatWentWrong: { en: "What went wrong", he: "מה השתבש" },
  tryThisInstead: { en: "Try this instead", he: "נסה כך" },
  explainWhy: { en: "Explain why", he: "הסבר למה" },
  showCorrect: { en: "Show me the correct step", he: "הראה לי את הצעד הנכון" },
  // Graph
  graphTitle: { en: "Graph of the function", he: "גרף הפונקציה" },
  graphRange: { en: "range", he: "תחום" },
  // Practice mode
  practice: { en: "Practice", he: "תרגול" },
  notebook2: { en: "Notebook", he: "מחברת" },
  practiceMore: { en: "Practice more like this", he: "תרגל עוד כאלו" },
  generating: { en: "Generating…", he: "יוצר…" },
  addToDeck: { en: "Add to my deck", he: "הוסף לחפיסה שלי" },
  dueToday: { en: "Due today", he: "להיום" },
  mastered: { en: "Mastered", he: "נשלט" },
  emptyDeck: { en: "Your deck is empty. Get a problem wrong, then tap \"Practice more like this\" to fill it.", he: "החפיסה שלך ריקה. טעה בתרגיל וגע ב'תרגל עוד כאלו' כדי למלא אותה." },
  startSession: { en: "Start practice session", he: "התחל מפגש תרגול" },
  scheduled: { en: "scheduled", he: "מתוזמנים" },
  // Worked solution
  imStuck: { en: "I'm stuck — show me the solution", he: "אני תקוע — הראה לי את הפתרון" },
  hideSolution: { en: "Hide solution", he: "הסתר פתרון" },
  workedSolution: { en: "Worked solution", he: "פתרון מלא" },
  step: { en: "Step", he: "צעד" },
  // Multi-part
  part: { en: "Part", he: "סעיף" },
  subPromptPh: { en: "Optional: sub-question text (e.g. \"Find f'(π/2) using the result from (a)\")", he: "אופציונלי: טקסט תת-שאלה (למשל \"מצא f'(π/2) באמצעות התוצאה מסעיף (א)\")" },
  addPart: { en: "Add part", he: "הוסף סעיף" },
  removePart: { en: "Remove part", he: "הסר סעיף" },
  context: { en: "Context", he: "הקשר" },
  fromPrev: { en: "from previous parts", he: "מסעיפים קודמים" },
} satisfies Record<string, Record<Lang, string>>;

export type Key = keyof typeof dict;

export function t(key: Key, lang: Lang): string {
  return dict[key][lang];
}

// Domain / technique → Hebrew labels for the metadata pills.
const domainHe: Record<string, string> = {
  derivatives: "נגזרות", integrals: "אינטגרלים", limits: "גבולות", series: "טורים",
  multivariable: "רב-משתני", diffeq: "משוואות דיפרנציאליות", linalg: "אלגברה ליניארית",
  algebra: "אלגברה", proof: "הוכחה", physics: "פיזיקה", other: "אחר",
};
const techniqueHe: Record<string, string> = {
  "chain rule": "כלל השרשרת", "product rule": "כלל המכפלה", "quotient rule": "כלל המנה",
  "u-substitution": "החלפת משתנה", "integration by parts": "אינטגרציה בחלקים",
  "L'Hopital": "כלל לופיטל", "L'Hôpital": "כלל לופיטל",
  "partial differentiation": "גזירה חלקית", "implicit differentiation": "גזירה סתומה",
  "induction": "אינדוקציה", "factoring": "פירוק לגורמים", "elimination": "אלימינציה",
  "completing the square": "השלמה לריבוע",
};

export function localizeDomain(d: string | null | undefined, lang: Lang): string | null {
  if (!d) return null;
  if (lang === "en") return d;
  return domainHe[d.toLowerCase()] ?? d;
}
export function localizeTechnique(s: string | null | undefined, lang: Lang): string | null {
  if (!s) return null;
  if (lang === "en") return s;
  return techniqueHe[s] ?? techniqueHe[s.toLowerCase()] ?? s;
}

const LANG_KEY = "mathpad.lang";
export function loadLang(): Lang {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(LANG_KEY);
  return v === "he" ? "he" : "en";
}
export function saveLang(lang: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_KEY, lang);
}
