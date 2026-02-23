/**
 * Profile Service
 *
 * Business logic for user profile operations.
 * Used by API routes; does not use server actions.
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import * as storageService from "@/lib/services/storage/storage.service";
import * as passwordService from "@/lib/services/auth/password.service";
import * as usersDal from "@/lib/data-access/users.dal";
import * as roles from "@/lib/permissions/roles";
import type { Database } from "@/lib/types/database.types";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile.schema";
import { ForbiddenError } from "@/lib/utils/errors";
import { z } from "zod";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

/**
 * Get current user's profile (allows pending users to view)
 */
export async function getCurrentUserProfile(): Promise<User> {
  const { dbUser } = await requireAuth(true);
  return dbUser;
}

/** Result of updateProfile when password was changed (client should sign out) */
export type UpdateProfileResult = User & { passwordChanged?: true };

/**
 * Update user profile (first_name, last_name, city, phone, password)
 * When password is changed, client should sign user out to re-login with new password.
 */
export async function updateProfile(data: UpdateProfileInput): Promise<UpdateProfileResult> {
  const { id: userId, dbUser } = await requireAuth();

  if (dbUser.status === "pending") {
    throw new ForbiddenError(
      "Your account is pending activation. You cannot update your profile until your account is activated."
    );
  }

  const validatedData = updateProfileSchema.parse(data);
  const isGlobalDirector = await roles.isGlobalDirector(userId);

  const {
    password,
    password_confirmation: _unusedPasswordConfirmation,
    password_change_verification_token,
    email,
    role,
    status,
    ...profileUpdates
  } = validatedData;
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

  const updateData: UserUpdate = {
    first_name: profileUpdates.first_name,
    last_name: profileUpdates.last_name ?? null,
    city: profileUpdates.city ?? null,
    phone: profileUpdates.phone && profileUpdates.phone.trim() !== "" ? profileUpdates.phone : null,
  };

  if (isGlobalDirector) {
    if (email !== undefined) {
      const newEmail = email.trim().toLowerCase();
      const currentEmail = (dbUser.email ?? "").trim().toLowerCase();
      if (newEmail !== currentEmail) {
        await passwordService.updateAuthEmail(userId, newEmail);
      }
      updateData.email = newEmail;
    }
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
  } else {
    if (email !== undefined || role !== undefined || status !== undefined) {
      throw new ForbiddenError("Only Global Directors can update email, role, and status");
    }
  }

  const updatedUser = await usersDal.update(userId, updateData);
  revalidatePath("/dashboard/profile");
  revalidatePath("/profile");

  const result: UpdateProfileResult = { ...updatedUser };
  if (passwordChanged) result.passwordChanged = true;
  return result;
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(formData: FormData): Promise<{ url: string }> {
  const { id: userId, dbUser } = await requireAuth();

  const file = formData.get("avatar") as File;
  if (!file) throw new Error("No file provided");

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
  }
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File size must be less than 2MB");

  if (dbUser.avatar_url) {
    await storageService.deleteAvatar(userId, dbUser.avatar_url);
  }
  const avatarUrl = await storageService.uploadAvatar(userId, file);
  await usersDal.update(userId, { avatar_url: avatarUrl });
  revalidatePath("/profile");
  return { url: avatarUrl };
}

/**
 * Remove user avatar
 */
export async function removeAvatar(): Promise<void> {
  const { id: userId, dbUser } = await requireAuth();
  if (dbUser.avatar_url) {
    await storageService.deleteAvatar(userId, dbUser.avatar_url);
    await usersDal.update(userId, { avatar_url: null });
    revalidatePath("/profile");
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: {
  email_enabled: boolean;
  event_approved?: boolean;
  event_rejected?: boolean;
  report_due?: boolean;
  reports_pending_approval?: boolean;
}): Promise<User> {
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
}
