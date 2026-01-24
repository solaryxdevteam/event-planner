/**
 * Profile Server Actions
 *
 * Server actions for user profile operations
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import * as storageService from "@/lib/services/storage/storage.service";
import * as passwordService from "@/lib/services/auth/password.service";
import * as usersDal from "@/lib/data-access/users.dal";
import * as roles from "@/lib/permissions/roles";
import type { ActionResponse } from "@/lib/types/api.types";
import { handleAsync } from "@/lib/utils/response";
import type { Database } from "@/lib/types/database.types";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile.schema";
import { ForbiddenError } from "@/lib/utils/errors";
import { UserRole } from "@/lib/types/roles";
import { z } from "zod";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

/**
 * Get current user's profile
 * Allows pending users to view their profile
 */
export async function getCurrentUserProfile(): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const { dbUser } = await requireAuth(true); // Allow pending users
    return dbUser;
  }, "getCurrentUserProfile");
}

/**
 * Update user profile (first_name, last_name, company, state_id, city, phone, password)
 *
 * IMPORTANT: Users with status='pending' cannot update their profile
 */
export async function updateProfile(data: UpdateProfileInput): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const { id: userId, dbUser } = await requireAuth();

    // Block updates if user status is pending
    if (dbUser.status === "pending") {
      throw new ForbiddenError(
        "Your account is pending activation. You cannot update your profile until your account is activated."
      );
    }

    // Validate input
    const validatedData = updateProfileSchema.parse(data);

    // Check if user is Global Director for admin fields
    const isGlobalDirector = await roles.isGlobalDirector(userId);

    // Handle password update separately if provided
    const { password, password_confirmation, email, role, status, ...profileUpdates } = validatedData;

    if (password && password.trim() !== "") {
      await passwordService.updatePassword(userId, password);
    }

    // Prepare update object
    const updateData: UserUpdate = {
      first_name: profileUpdates.first_name,
      last_name: profileUpdates.last_name ?? null,
      company: profileUpdates.company ?? null,
      state_id: profileUpdates.state_id ?? null,
      city: profileUpdates.city ?? null,
      phone: profileUpdates.phone && profileUpdates.phone.trim() !== "" ? profileUpdates.phone : null,
    };

    // Only Global Director can update email, role, and status
    if (isGlobalDirector) {
      if (email !== undefined) {
        updateData.email = email;
      }
      if (role !== undefined) {
        updateData.role = role;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
    } else {
      // Non-global directors cannot update these fields
      if (email !== undefined || role !== undefined || status !== undefined) {
        throw new ForbiddenError("Only Global Directors can update email, role, and status");
      }
    }

    const updatedUser = await usersDal.update(userId, updateData);

    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");

    return updatedUser;
  }, "updateProfile");
}

/**
 * Upload user avatar
 *
 * @param formData - FormData containing the avatar file
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResponse<{ url: string }>> {
  return handleAsync(async () => {
    const { id: userId, dbUser } = await requireAuth();

    // Get file from form data
    const file = formData.get("avatar") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      throw new Error("File size must be less than 2MB");
    }

    // Delete old avatar if exists
    if (dbUser.avatar_url) {
      await storageService.deleteAvatar(userId, dbUser.avatar_url);
    }

    // Upload new avatar
    const avatarUrl = await storageService.uploadAvatar(userId, file);

    // Update user record with new avatar URL
    await usersDal.update(userId, { avatar_url: avatarUrl });

    revalidatePath("/profile");

    return { url: avatarUrl };
  }, "uploadAvatar");
}

/**
 * Remove user avatar
 */
export async function removeAvatar(): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    const { id: userId, dbUser } = await requireAuth();

    if (dbUser.avatar_url) {
      // Delete avatar file
      await storageService.deleteAvatar(userId, dbUser.avatar_url);

      // Update user record to remove avatar URL
      await usersDal.update(userId, { avatar_url: null });

      revalidatePath("/profile");
    }

    return undefined;
  }, "removeAvatar");
}

/**
 * Update notification preferences
 * NOTE: notification_prefs column has been removed and will be re-implemented later
 */
export async function updateNotificationPreferences(preferences: {
  email: boolean;
  frequency: "instant" | "daily" | "weekly";
}): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const { id: userId } = await requireAuth();

    // Validate preferences
    const schema = z.object({
      email: z.boolean(),
      frequency: z.enum(["instant", "daily", "weekly"]),
    });
    schema.parse(preferences);

    // TODO: Re-implement notification_prefs column later
    // For now, just return the current user without updating
    // Get current user - users can always access their own profile
    const currentUser = await usersDal.findById(userId, [userId]);
    if (!currentUser) {
      throw new Error("User not found");
    }

    revalidatePath("/profile");

    return currentUser;
  }, "updateNotificationPreferences");
}
