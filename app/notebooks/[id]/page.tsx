"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import NotebookView from "./NotebookView";
import { getNotebooks, getPages } from "@/lib/dataService";
import type { DbNotebook, DbPage } from "@/lib/dataService";
import { loadLang, type Lang } from "@/lib/i18n";

export default function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [notebook, setNotebook] = useState<DbNotebook | null>(null);
  const [pages, setPages] = useState<DbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(loadLang());
    const loadNotebookData = async () => {
      try {
        const nbs = await getNotebooks();
        const nb = nbs.find((n) => n.id === id) || null;
        if (!nb) {
          router.push("/notebooks");
          return;
        }
        setNotebook(nb);
        const pgs = await getPages(id);
        setPages(pgs);
      } catch (e) {
        console.error(e);
        router.push("/notebooks");
      } finally {
        setLoading(false);
      }
    };
    loadNotebookData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!notebook) return null;

  return <NotebookView notebook={notebook} pages={pages} />;
}
