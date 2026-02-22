/**
 * Debug: check if SUPABASE_SERVICE_ROLE_KEY is available (same resolution as createAdminClient).
 * GET /api/debug/env-check — remove this route once env is confirmed.
 */
import { NextResponse } from "next/server";
import { resolveServiceRoleKey } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleSet = !!resolveServiceRoleKey();

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? "set" : "missing",
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleSet ? "set" : "missing",
    hint: !serviceRoleSet
      ? "Set SUPABASE_SERVICE_ROLE_KEY in host env vars (and redeploy) or in .env in the app root."
      : undefined,
  });
}
