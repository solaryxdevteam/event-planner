/**
 * Debug: check if SUPABASE_SERVICE_ROLE_KEY is available at runtime.
 * Call GET /api/debug/env-check on your deployment to verify.
 * Remove or disable this route in production once you've confirmed env vars work.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? "set" : "missing",
    SUPABASE_SERVICE_ROLE_KEY: serviceRole ? "set" : "missing",
    hint: !serviceRole
      ? "Set SUPABASE_SERVICE_ROLE_KEY in Hostinger: Settings & Redeploy → Environment variables, then Redeploy."
      : undefined,
  });
}
