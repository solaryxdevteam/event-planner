/**
 * Authentication Server Actions
 * Example server actions demonstrating auth usage
 */

"use server";

import { requireAuth, requireRole, requireMinimumRole, requireActiveUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/lib/types/api.types";
import type { User } from "@/lib/types/database.types";
import { handleAsync } from "@/lib/utils/response";

/**
 * Example: Get current user profile
 * Demonstrates basic authentication check
 */
export async function getCurrentUserProfile(): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireAuth();
    return user.dbUser;
  }, "getCurrentUserProfile");
}

/**
 * Example: Update user profile
 * Demonstrates authenticated mutation
 */
export async function updateUserProfile(data: {
  name?: string;
  city?: string;
  region?: string;
  avatar_url?: string;
}): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        name: data.name,
        city: data.city,
        region: data.region,
        avatar_url: data.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    return updatedUser;
  }, "updateUserProfile");
}

/**
 * Example: Admin-only action
 * Demonstrates role-based access control
 */
export async function deactivateUser(userId: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    // Only global directors can deactivate users
    await requireRole(["global_director"]);

    const supabase = await createClient();

    const { error } = await supabase.from("users").update({ is_active: false }).eq("id", userId);

    if (error) throw error;
  }, "deactivateUser");
}

/**
 * Example: Hierarchical permission check
 * Demonstrates minimum role requirement
 */
export async function approveEvent(eventId: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    // Only curators and above can approve events
    const user = await requireMinimumRole("city_curator");
    const supabase = await createClient();

    // Update the approval
    const { error } = await supabase
      .from("event_approvals")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", eventId)
      .eq("approver_id", user.id)
      .eq("status", "pending");

    if (error) throw error;
  }, "approveEvent");
}

/**
 * Example: Create user profile (for onboarding)
 * This is called after magic link authentication
 */
export async function completeUserProfile(data: {
  name: string;
  city?: string;
  region?: string;
}): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const supabase = await createClient();

    // Get the authenticated Supabase user
    const {
      data: { user: supabaseUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("*").eq("id", supabaseUser.id).single();

    if (existingUser) {
      throw new Error("User profile already exists");
    }

    // Create the user profile
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: data.name,
        city: data.city,
        region: data.region,
        role: "event_planner", // Default role
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUser;
  }, "completeUserProfile");
}

/**
 * Example: Action that requires active user
 * Demonstrates checking if user account is active
 */
export async function createEvent(data: {
  title: string;
  description: string;
  event_date: string;
}): Promise<ActionResponse<{ id: string }>> {
  return handleAsync(async () => {
    // Ensure user is authenticated and active
    const user = await requireActiveUser();
    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        creator_id: user.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;
    return event;
  }, "createEvent");
}
