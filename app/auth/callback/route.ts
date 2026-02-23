/**
 * Auth Callback Route Handler
 * Handles authentication callbacks from Supabase
 * Checks user status and redirects accordingly
 *
 * This route matches the Supabase redirect URL: /auth/callback
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { User } from "@/lib/types/database.types";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirect_to") || "/dashboard";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const origin = baseUrl.replace(/\/$/, "");

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
      const { data: dbUser, error: dbError } = await supabase.from("users").select("*").eq("id", user.id).single();

      if (dbError || !dbUser) {
        // User is authenticated but not in our database
        // This shouldn't happen with invitation system, but handle it
        return NextResponse.redirect(
          `${origin}/auth/error?message=${encodeURIComponent("User not found in database")}`
        );
      }

      // Type assertion for dbUser
      const userData = dbUser as User;

      // Check user status
      if (userData.status === "pending") {
        // User is pending activation; send to requested page (e.g. profile) or pending page
        return NextResponse.redirect(`${origin}${redirectTo || "/auth/pending"}`);
      }

      if (userData.status === "inactive") {
        // User is deactivated
        return NextResponse.redirect(
          `${origin}/auth/error?message=${encodeURIComponent("Your account has been deactivated. Please contact an administrator.")}`
        );
      }

      // User is active, proceed to dashboard
      if (userData.status === "active") {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }

    // Fallback: redirect to login
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // No code present, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
