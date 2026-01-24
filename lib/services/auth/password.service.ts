/**
 * Password Service
 * Password management utilities using Supabase Auth
 */

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Create a user with password in Supabase Auth
 * This creates the auth user and returns the user ID
 *
 * @param email - User email
 * @param password - User password
 * @param metadata - Additional user metadata
 * @returns User ID from Supabase Auth
 */
export async function createAuthUser(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: metadata || {},
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Failed to create auth user: No user returned");
  }

  return data.user.id;
}

/**
 * Update user password in Supabase Auth
 *
 * @param userId - User ID
 * @param newPassword - New password
 */
export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

import { randomBytes } from "crypto";

/**
 * Generate a secure random password
 * Useful for creating users directly
 *
 * @param length - Password length (default: 16)
 * @returns Random password
 */
export function generateRandomPassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const randomValues = randomBytes(length);

  return Array.from(randomValues)
    .map((value) => charset[value % charset.length])
    .join("");
}
