"use client";

import { useEffect } from "react";
import CheckResult, { type CheckResultData } from "./CheckResult";
import { type Lang, t } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  result: CheckResultData | null;
  studentLines: string[];
  problem?: string;
  lang: Lang;
};

/**
 * Slide-in drawer that hosts the CheckResult panel.
 * - Slides in from the right (or left in RTL) — page paper stays in view behind it.
 * - Backdrop dims the page; clicking it closes the drawer.
 * - Esc closes the drawer.
 * - Drawer width is 32rem on desktop, full viewport on mobile.
 */
export default function ResultDrawer({ open, onClose, result, studentLines, problem, lang }: Props) {
  const isRtl = lang === "he";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        dir={isRtl ? "rtl" : "ltr"}
        className={`fixed top-0 z-50 h-screen w-full sm:w-[32rem] max-w-full bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out ${
          isRtl ? "left-0" : "right-0"
        } ${
          open
            ? "translate-x-0"
            : isRtl
            ? "-translate-x-full"
            : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer header */}
          <header className="flex items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">auto_awesome</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
                {t("lumenResult", lang)}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center"
              aria-label="Close result"
              title={lang === "he" ? "סגור (Esc)" : "Close (Esc)"}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto">
            {result ? (
              <div className="p-3">
                <CheckResult result={result} studentLines={studentLines} problem={problem} lang={lang} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-on-surface-variant">
                {lang === "he" ? "אין עדיין תוצאה" : "No result yet"}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
