/**
 * Supabase Server Client
 * This client uses cookies for SSR and works in Server Components, Route Handlers, and Server Actions
 */

import { createServerClient } from "@supabase/ssr";
import { config as dotenvConfig } from "dotenv";
import { cookies } from "next/headers";
import path from "path";
import type { Database } from "@/lib/types/database.types";

/**
 * Service role key is server-only by design (never use NEXT_PUBLIC_* — that would expose it to the browser).
 * Hosts typically inject env vars at runtime. When not set, we load from .env files (local + production).
 */
export function resolveServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key) return key;

  try {
    const cwd = process.cwd();
    const envFiles = [".env", ".env.production", ".env.local"];
    for (const file of envFiles) {
      dotenvConfig({ path: path.join(cwd, file), override: true });
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Creates a Supabase client for server-side operations
 * This client reads and writes cookies for authentication state
 *
 * Use this in:
 * - Server Components
 * - Server Actions
 * - Route Handlers (API routes)
 * - Middleware
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase admin client with service role key
 * ⚠️ WARNING: Use with extreme caution! This has full database access.
 *
 * Only use for:
 * - System-level tasks that don't require user authentication
 * - Admin operations that need to access all data
 * - Background jobs and maintenance tasks
 *
 * Note: RLS is enabled on public tables; the service role bypasses RLS. User-facing
 * access uses createClient() (anon + JWT) and is constrained by RLS and the Service Layer.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = resolveServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in your host's env vars (and redeploy) or in a .env file in the app root."
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for admin client
      },
    },
  });
}
