/**
 * Authentication Client Functions
 * Client-side authentication helpers for email/password auth
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import type { ActionResponse } from "@/lib/types/api.types";

/**
 * Sign in with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise with success/error response
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<ActionResponse<{ message: string }>> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
        message: "Signed in successfully",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign in",
    };
  }
}

/**
 * Sign out the current user
 * Clears the session and redirects to home page
 */
export async function signOut(): Promise<ActionResponse<void>> {
  try {
    const supabase = createClient();

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
  const supabase = createClient();
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
  const supabase = createClient();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user?.id ?? null);
  });

  return () => subscription.unsubscribe();
}
