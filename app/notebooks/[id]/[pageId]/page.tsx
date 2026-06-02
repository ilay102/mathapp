"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageEditor from "./PageEditor";
import { getPage, type DbPage } from "@/lib/dataService";

export default function PageView({
  params,
}: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<DbPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getPage(pageId);
        if (cancelled) return;
        if (!p) {
          setStatus("missing");
          router.replace(`/notebooks/${id}`);
          return;
        }
        setPage(p);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("missing");
          router.replace(`/notebooks/${id}`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id, pageId, router]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse text-sm text-on-surface-variant">Loading page…</div>
      </main>
    );
  }
  if (status !== "ready" || !page) return null;
  // Normalize the optional `ocr_lines` field PageEditor expects as `string[] | null`.
  const normalizedPage = {
    id: page.id,
    notebook_id: page.notebook_id,
    problem: page.problem,
    strokes: page.strokes,
    ocr_lines: page.ocr_lines ?? null,
    created_at: page.created_at,
    updated_at: page.updated_at,
  };
  return <PageEditor page={normalizedPage} notebookId={id} />;
}
