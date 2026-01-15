/**
 * Supabase Client for Client Components
 * This client uses browser cookies and works with Client Components
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Creates or returns the singleton Supabase client for browser use
 * This client automatically handles authentication state and cookies
 */
export function createClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return client;
}

/**
 * Get the current Supabase client instance
 * Use this in Client Components for queries and mutations
 */
export function getSupabaseClient() {
  return createClient();
}
