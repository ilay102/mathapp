import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageEditor from "./PageEditor";

export const dynamic = "force-dynamic";

export default async function PageView({
  params,
}: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await sb
    .from("pages")
    .select("id, notebook_id, problem, strokes, ocr_lines")
    .eq("id", pageId)
    .single();
  if (!page) redirect(`/notebooks/${id}`);

  return <PageEditor page={page} notebookId={id} />;
}
