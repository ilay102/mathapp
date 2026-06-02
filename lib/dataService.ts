import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { Part } from "@/lib/exercise";

export type DbNotebook = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  owner?: string;
};

export type DbPage = {
  id: string;
  notebook_id: string;
  problem: string;
  strokes: {
    parts?: Part[];
    problemImage?: string | null;
  } | null;
  ocr_lines?: string[] | null;
  created_at: string;
  updated_at: string;
  owner?: string;
};

// Storage keys for local fallback
const STORAGE_NOTEBOOKS = "mathpad.local_notebooks";
const STORAGE_PAGES = "mathpad.local_pages";

// Helper to check if a user is logged in
export async function getSessionUser() {
  if (!supabaseConfigured) return null;
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Helper to generate UUID-like IDs for local data
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// -------------------------------------------------------------
// NOTEBOOK ACTIONS
// -------------------------------------------------------------

export async function getNotebooks(): Promise<DbNotebook[]> {
  const user = await getSessionUser();
  if (user) {
    const sb = createClient();
    const { data, error } = await sb
      .from("notebooks")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } else {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_NOTEBOOKS);
    const list = raw ? JSON.parse(raw) as DbNotebook[] : [];
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
}

export async function createNotebook(title: string): Promise<DbNotebook> {
  const user = await getSessionUser();
  const now = new Date().toISOString();
  if (user) {
    const sb = createClient();
    const { data, error } = await sb
      .from("notebooks")
      .insert({ owner: user.id, title, created_at: now, updated_at: now })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw error;
    return data!;
  } else {
    if (typeof window === "undefined") throw new Error("Window not defined");
    const id = generateUUID();
    const newNb: DbNotebook = { id, title, created_at: now, updated_at: now };
    const raw = localStorage.getItem(STORAGE_NOTEBOOKS);
    const list = raw ? JSON.parse(raw) as DbNotebook[] : [];
    list.push(newNb);
    localStorage.setItem(STORAGE_NOTEBOOKS, JSON.stringify(list));
    return newNb;
  }
}

export async function updateNotebook(id: string, title: string): Promise<void> {
  const user = await getSessionUser();
  const now = new Date().toISOString();
  if (user) {
    const sb = createClient();
    const { error } = await sb
      .from("notebooks")
      .update({ title, updated_at: now })
      .eq("id", id);
    if (error) throw error;
  } else {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_NOTEBOOKS);
    if (!raw) return;
    let list = JSON.parse(raw) as DbNotebook[];
    list = list.map((n) => (n.id === id ? { ...n, title, updated_at: now } : n));
    localStorage.setItem(STORAGE_NOTEBOOKS, JSON.stringify(list));
  }
}

export async function deleteNotebook(id: string): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    const sb = createClient();
    const { error } = await sb.from("notebooks").delete().eq("id", id);
    if (error) throw error;
  } else {
    if (typeof window === "undefined") return;
    // Delete notebook
    const rawN = localStorage.getItem(STORAGE_NOTEBOOKS);
    if (rawN) {
      const listN = JSON.parse(rawN) as DbNotebook[];
      localStorage.setItem(STORAGE_NOTEBOOKS, JSON.stringify(listN.filter((n) => n.id !== id)));
    }
    // Cascade delete pages
    const rawP = localStorage.getItem(STORAGE_PAGES);
    if (rawP) {
      const listP = JSON.parse(rawP) as DbPage[];
      localStorage.setItem(STORAGE_PAGES, JSON.stringify(listP.filter((p) => p.notebook_id !== id)));
    }
  }
}

// -------------------------------------------------------------
// PAGE ACTIONS
// -------------------------------------------------------------

export async function getPages(notebookId: string): Promise<DbPage[]> {
  const user = await getSessionUser();
  if (user) {
    const sb = createClient();
    const { data, error } = await sb
      .from("pages")
      .select("id, notebook_id, problem, strokes, ocr_lines, created_at, updated_at")
      .eq("notebook_id", notebookId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(p => ({
      ...p,
      strokes: typeof p.strokes === "string" ? JSON.parse(p.strokes) : p.strokes
    }));
  } else {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_PAGES);
    const list = raw ? JSON.parse(raw) as DbPage[] : [];
    return list
      .filter((p) => p.notebook_id === notebookId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
}

export async function getPage(pageId: string): Promise<DbPage | null> {
  const user = await getSessionUser();
  if (user) {
    const sb = createClient();
    const { data, error } = await sb
      .from("pages")
      .select("id, notebook_id, problem, strokes, ocr_lines, created_at, updated_at")
      .eq("id", pageId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      strokes: typeof data.strokes === "string" ? JSON.parse(data.strokes) : data.strokes
    };
  } else {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_PAGES);
    if (!raw) return null;
    const list = JSON.parse(raw) as DbPage[];
    return list.find((p) => p.id === pageId) ?? null;
  }
}

export async function createPage(
  notebookId: string,
  problem = "",
  problemImage: string | null = null,
  parts: Part[] = []
): Promise<DbPage> {
  const user = await getSessionUser();
  const now = new Date().toISOString();
  const strokesPayload = { parts, problemImage };
  const ocrLines = parts.flatMap((p) => p.linesText.split("\n").filter(Boolean));

  if (user) {
    const sb = createClient();
    const { data, error } = await sb
      .from("pages")
      .insert({
        notebook_id: notebookId,
        owner: user.id,
        problem,
        strokes: strokesPayload,
        ocr_lines: ocrLines,
        created_at: now,
        updated_at: now,
      })
      .select("id, notebook_id, problem, strokes, ocr_lines, created_at, updated_at")
      .single();
    if (error) throw error;
    return {
      ...data!,
      strokes: typeof data!.strokes === "string" ? JSON.parse(data!.strokes) : data!.strokes
    };
  } else {
    if (typeof window === "undefined") throw new Error("Window not defined");
    const id = generateUUID();
    const newPg: DbPage = {
      id,
      notebook_id: notebookId,
      problem,
      strokes: strokesPayload,
      ocr_lines: ocrLines,
      created_at: now,
      updated_at: now,
    };
    const raw = localStorage.getItem(STORAGE_PAGES);
    const list = raw ? JSON.parse(raw) as DbPage[] : [];
    list.push(newPg);
    localStorage.setItem(STORAGE_PAGES, JSON.stringify(list));
    return newPg;
  }
}

export async function updatePage(
  pageId: string,
  patch: {
    problem?: string;
    parts?: Part[];
    problemImage?: string | null;
  }
): Promise<void> {
  const user = await getSessionUser();
  const now = new Date().toISOString();

  if (user) {
    const sb = createClient();
    // Get existing to merge strokes
    const { data: existing } = await sb
      .from("pages")
      .select("problem, strokes, ocr_lines")
      .eq("id", pageId)
      .single();

    let mergedStrokes = existing?.strokes;
    if (typeof mergedStrokes === "string") {
      mergedStrokes = JSON.parse(mergedStrokes);
    }
    mergedStrokes = {
      ...(mergedStrokes || {}),
      ...(patch.parts !== undefined ? { parts: patch.parts } : {}),
      ...(patch.problemImage !== undefined ? { problemImage: patch.problemImage } : {}),
    };

    const ocrLines = patch.parts
      ? patch.parts.flatMap((p) => p.linesText.split("\n").filter(Boolean))
      : existing?.ocr_lines;

    const { error } = await sb
      .from("pages")
      .update({
        ...(patch.problem !== undefined ? { problem: patch.problem } : {}),
        strokes: mergedStrokes,
        ocr_lines: ocrLines,
        updated_at: now,
      })
      .eq("id", pageId);
    if (error) throw error;
  } else {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_PAGES);
    if (!raw) return;
    let list = JSON.parse(raw) as DbPage[];
    list = list.map((p) => {
      if (p.id === pageId) {
        const mergedStrokes = {
          ...(p.strokes || {}),
          ...(patch.parts !== undefined ? { parts: patch.parts } : {}),
          ...(patch.problemImage !== undefined ? { problemImage: patch.problemImage } : {}),
        };
        const ocrLines = patch.parts
          ? patch.parts.flatMap((pt) => pt.linesText.split("\n").filter(Boolean))
          : p.ocr_lines;
        return {
          ...p,
          ...(patch.problem !== undefined ? { problem: patch.problem } : {}),
          strokes: mergedStrokes,
          ocr_lines: ocrLines,
          updated_at: now,
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_PAGES, JSON.stringify(list));
  }
}

export async function deletePage(pageId: string): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    const sb = createClient();
    const { error } = await sb.from("pages").delete().eq("id", pageId);
    if (error) throw error;
  } else {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_PAGES);
    if (!raw) return;
    const list = JSON.parse(raw) as DbPage[];
    localStorage.setItem(STORAGE_PAGES, JSON.stringify(list.filter((p) => p.id !== pageId)));
  }
}

// -------------------------------------------------------------
// SYNC UTILITY (Local Storage → Supabase)
// -------------------------------------------------------------

export async function syncLocalData(): Promise<void> {
  const user = await getSessionUser();
  if (!user || typeof window === "undefined") return;

  const rawN = localStorage.getItem(STORAGE_NOTEBOOKS);
  const rawP = localStorage.getItem(STORAGE_PAGES);
  if (!rawN) return;

  const localNotebooks = JSON.parse(rawN) as DbNotebook[];
  const localPages = rawP ? JSON.parse(rawP) as DbPage[] : [];

  if (localNotebooks.length === 0) return;

  const sb = createClient();

  for (const localNb of localNotebooks) {
    // 1. Insert notebook
    const { data: newNb, error: nbErr } = await sb
      .from("notebooks")
      .insert({ owner: user.id, title: localNb.title })
      .select("id")
      .single();

    if (nbErr || !newNb) continue;

    // 2. Insert pages for this notebook
    const pagesToInsert = localPages
      .filter((p) => p.notebook_id === localNb.id)
      .map((p) => ({
        notebook_id: newNb.id,
        owner: user.id,
        problem: p.problem,
        strokes: p.strokes,
        ocr_lines: p.ocr_lines,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

    if (pagesToInsert.length > 0) {
      await sb.from("pages").insert(pagesToInsert);
    }
  }

  // Clear local storage notebooks/pages after successful sync
  localStorage.removeItem(STORAGE_NOTEBOOKS);
  localStorage.removeItem(STORAGE_PAGES);
}
