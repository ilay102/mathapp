import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin), 302);

  const { data, error } = await sb
    .from("notebooks")
    .insert({ owner: user.id, title: "Untitled notebook" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL(`/notebooks/${data!.id}`, origin), 302);
}
