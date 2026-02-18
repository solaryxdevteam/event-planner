/**
 * Authentication Server Actions
 * Example server actions demonstrating auth usage
 */

"use server";

import { requireAuth, requireRole, requireMinimumRole, requireActiveUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/lib/types/api.types";
import type { User, Invitation, Database } from "@/lib/types/database.types";
import { handleAsync } from "@/lib/utils/response";
import * as userService from "@/lib/services/users/user.service";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { registerWithInvitationSchema, activateUserSchema } from "@/lib/validation/users.schema";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/lib/types/roles";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventApprovalUpdate = Database["public"]["Tables"]["event_approvals"]["Update"];

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
  first_name?: string;
  last_name?: string | null;
  country_id?: string;
  city?: string | null;
  avatar_url?: string;
}): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireAuth();
    const supabase = await createClient();

    const updateData: UserUpdate = {
      first_name: data.first_name,
      last_name: data.last_name,
      country_id: data.country_id,
      city: data.city,
      avatar_url: data.avatar_url,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedUser, error } = await supabase
      .from("users")
      // @ts-expect-error - Supabase type inference issue with Database types
      .update(updateData)
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
    await requireRole([UserRole.GLOBAL_DIRECTOR]);

    const supabase = await createClient();

    const updateData: UserUpdate = { is_active: false };
    const { error } = await supabase
      .from("users")
      // @ts-expect-error - Supabase type inference issue with Database types
      .update(updateData)
      .eq("id", userId);

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
    const updateData: EventApprovalUpdate = {
      status: "approved",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("event_approvals")
      // @ts-expect-error - Supabase type inference issue with Database types
      .update(updateData)
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
  first_name: string;
  last_name?: string | null;
  country_id?: string;
  city?: string | null;
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

    // Get default US country ID if not provided
    let countryId = data.country_id;
    if (!countryId) {
      const { data: usCountry, error: countryError } = await supabase
        .from("locations")
        .select("id")
        .eq("type", "country")
        .eq("code", "US")
        .single();

      if (countryError || !usCountry) {
        throw new Error("US country not found in locations table");
      }
      countryId = (usCountry as { id: string }).id;
    }

    // Create the user profile
    const insertData: UserInsert = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      first_name: data.first_name,
      last_name: data.last_name || null,
      country_id: countryId,
      city: data.city || null,
      role: UserRole.EVENT_PLANNER, // Default role
      parent_id: null,
      phone: null,
      status: "pending" as const,
      is_active: false,
      avatar_url: null,
      notification_prefs: null,
    };
    const { data: newUser, error: createError } = await supabase
      .from("users")
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert(insertData)
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
  notes?: string | null;
}): Promise<ActionResponse<{ id: string }>> {
  return handleAsync(async () => {
    // Ensure user is authenticated and active
    const user = await requireActiveUser();
    const supabase = await createClient();

    const insertData: EventInsert = {
      short_id: `EVT-${Math.floor(Math.random() * 90000 + 10000)}`,
      title: data.title,
      starts_at: null,
      venue_id: null,
      dj_id: null,
      creator_id: user.id,
      status: "draft",
      expected_attendance: null,
      minimum_ticket_price: null,
      minimum_table_price: null,
      notes: data.notes ?? null,
    };
    const { data: event, error } = await supabase
      .from("events")
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw error;
    return event;
  }, "createEvent");
}

/**
 * Register a user with an invitation token
 *
 * @param formData - Registration form data (token, first_name, last_name, email, phone, city, password)
 */
export async function registerWithInvitation(
  formData:
    | FormData
    | {
        token: string;
        first_name: string;
        last_name?: string | null;
        email: string;
        phone?: string | null;
        city?: string | null;
        password: string;
      }
): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    let data: {
      token: string;
      first_name: string;
      last_name?: string | null;
      email: string;
      phone?: string | null;
      city?: string | null;
      password: string;
    };

    if (formData instanceof FormData) {
      data = {
        token: formData.get("token") as string,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string | null,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string | null,
        city: formData.get("city") as string | null,
        password: formData.get("password") as string,
      };
    } else {
      data = formData;
    }

    // Validate input
    const validated = registerWithInvitationSchema.parse(data);

    // Register user
    const user = await userService.registerWithInvitation(validated.token, validated);

    return user;
  }, "registerWithInvitation");
}

/**
 * Validate an invitation token
 *
 * @param token - Invitation token to validate
 */
export async function validateInvitationToken(token: string): Promise<ActionResponse<Invitation>> {
  return handleAsync(async () => {
    const invitation = await invitationService.validateInvitation(token);

    if (!invitation) {
      throw new Error("Invalid or expired invitation token");
    }

    return invitation;
  }, "validateInvitationToken");
}

/**
 * Activate a user (Global Director only)
 *
 * @param formData - Activation form data (userId, role, parent_id)
 * Note: Location fields (country_id, city) are set during registration
 * and can be edited later via the user edit form
 */
export async function activateUser(
  formData:
    | FormData
    | {
        userId: string;
        role?: string;
        parent_id?: string | null;
      }
): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireRole(["global_director"]);

    // Parse form data
    let data: {
      userId: string;
      role?: string;
      parent_id?: string | null;
    };

    if (formData instanceof FormData) {
      data = {
        userId: formData.get("userId") as string,
        role: formData.get("role") as string | undefined,
        parent_id: formData.get("parent_id") ? (formData.get("parent_id") as string) : null,
      };
    } else {
      data = formData;
    }

    // Validate input
    const validated = activateUserSchema.parse(data);

    // Activate user
    const activatedUser = await userService.activateUser(user.id, validated);

    // Revalidate users page
    revalidatePath("/admin/users");
    revalidatePath("/users");

    return activatedUser;
  }, "activateUser");
}
