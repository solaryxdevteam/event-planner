/**
 * Auth Callback Route Handler
 * Handles the magic link callback from Supabase
 * Users are redirected here after clicking the magic link in their email
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to") || "/";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      // Redirect to error page or login with error message
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
    }

    // Check if user exists in our database, if not, redirect to onboarding
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: dbUser } = await supabase.from("users").select("*").eq("id", user.id).single();

      if (!dbUser) {
        // User is authenticated but not in our database
        // Redirect to onboarding/profile setup
        return NextResponse.redirect(`${origin}/auth/onboarding`);
      }
    }

    // Successful authentication, redirect to the intended page
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // No code present, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
