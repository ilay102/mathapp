import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasSidecar: !!process.env.OCR_BASE_URL,
    provider: process.env.OCR_PROVIDER || "auto",
  });
}
