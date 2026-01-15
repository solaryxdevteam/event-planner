/**
 * Authentication Client Functions
 * Client-side authentication helpers for magic link auth
 */

"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { ActionResponse } from "@/lib/types/api.types";

/**
 * Send a magic link to the user's email
 * The user will receive an email with a link to sign in
 *
 * @param email - User's email address
 * @param redirectTo - URL to redirect to after successful authentication (optional)
 * @returns Promise with success/error response
 */
export async function sendMagicLink(email: string, redirectTo?: string): Promise<ActionResponse<{ message: string }>> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        shouldCreateUser: true, // Allow new users to sign up
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: {
        message: "Check your email for the magic link!",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send magic link",
    };
  }
}

/**
 * Sign out the current user
 * Clears the session and redirects to home page
 */
export async function signOut(): Promise<ActionResponse<void>> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign out",
    };
  }
}

/**
 * Get the current authenticated user from the client
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error);
    return null;
  }

  return user;
}

/**
 * Listen to auth state changes
 * Useful for updating UI when user signs in/out
 *
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (userId: string | null) => void) {
  const supabase = getSupabaseClient();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user?.id ?? null);
  });

  return () => subscription.unsubscribe();
}

/**
 * Resend the magic link if the user didn't receive it
 * @param email - User's email address
 */
export async function resendMagicLink(email: string): Promise<ActionResponse<{ message: string }>> {
  return sendMagicLink(email);
}
