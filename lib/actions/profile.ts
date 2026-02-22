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
import { z } from "zod";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";

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

/** Result of updateProfile when password was changed (client should sign out) */
export type UpdateProfileResult = User & { passwordChanged?: true };

/**
 * Update user profile (first_name, last_name, city, phone, password)
 *
 * IMPORTANT: Users with status='pending' cannot update their profile
 * When password is changed, the client should sign the user out so they re-login with the new password.
 */
export async function updateProfile(data: UpdateProfileInput): Promise<ActionResponse<UpdateProfileResult>> {
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

    // Handle password update separately if provided (requires OTP verification token)
    const {
      password,
      password_confirmation: _unusedPasswordConfirmation,
      password_change_verification_token,
      email,
      role,
      status,
      ...profileUpdates
    } = validatedData;
    // password_confirmation is destructured but not used (password is validated separately)
    void _unusedPasswordConfirmation;

    let passwordChanged = false;
    if (password && password.trim() !== "") {
      if (!password_change_verification_token?.trim()) {
        throw new ForbiddenError(
          "Please verify your identity with the code sent to your email before changing password."
        );
      }
      await verificationOtpService.consumeVerificationToken(
        userId,
        "password_change",
        userId,
        "change",
        password_change_verification_token.trim()
      );
      await passwordService.updatePassword(userId, password);
      passwordChanged = true;
    }

    // Prepare update object
    const updateData: UserUpdate = {
      first_name: profileUpdates.first_name,
      last_name: profileUpdates.last_name ?? null,
      city: profileUpdates.city ?? null,
      phone: profileUpdates.phone && profileUpdates.phone.trim() !== "" ? profileUpdates.phone : null,
    };

    // Only Global Director can update email, role, and status
    if (isGlobalDirector) {
      if (email !== undefined) {
        const newEmail = email.trim().toLowerCase();
        const currentEmail = (dbUser.email ?? "").trim().toLowerCase();
        if (newEmail !== currentEmail) {
          // Update Supabase Auth email first so user can sign in with new email
          await passwordService.updateAuthEmail(userId, newEmail);
        }
        updateData.email = newEmail;
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

    const result: UpdateProfileResult = { ...updatedUser };
    if (passwordChanged) {
      result.passwordChanged = true;
    }
    return result;
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
 * Update notification preferences (per-action email toggles).
 * Frequency is not exposed in UI; stored as "instant" for future use.
 */
export async function updateNotificationPreferences(preferences: {
  email_enabled: boolean;
  event_approved?: boolean;
  event_rejected?: boolean;
  report_due?: boolean;
  reports_pending_approval?: boolean;
}): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const { id: userId } = await requireAuth();

    const schema = z.object({
      email_enabled: z.boolean(),
      event_approved: z.boolean().optional(),
      event_rejected: z.boolean().optional(),
      report_due: z.boolean().optional(),
      reports_pending_approval: z.boolean().optional(),
    });
    schema.parse(preferences);

    const updatedUser = await usersDal.update(userId, {
      notification_prefs: {
        email_enabled: preferences.email_enabled,
        frequency: "instant",
        event_approved: preferences.event_approved ?? true,
        event_rejected: preferences.event_rejected ?? true,
        report_due: preferences.report_due ?? true,
        reports_pending_approval: preferences.reports_pending_approval ?? true,
      },
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");

    return updatedUser;
  }, "updateNotificationPreferences");
}
