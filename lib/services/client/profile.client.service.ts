/**
 * Profile Client Service
 *
 * Client-side service for user profile operations
 * Makes API calls to /api/users/profile endpoints via API client
 * Does NOT access database or server actions
 */

import { apiClient, ApiError } from "./api-client";
import type { User } from "@/lib/types/database.types";
import type { UpdateProfileInput } from "@/lib/validation/profile.schema";

/** Result of updateProfile when password was changed (client should sign out) */
export type UpdateProfileResult = User & { passwordChanged?: true };

/**
 * Fetch current user profile
 */
export async function fetchProfile(): Promise<User> {
  return apiClient.get<User>("/api/users/profile");
}

/**
 * Update user profile. Returns user; if passwordChanged is true, client should sign out.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  return apiClient.put<UpdateProfileResult>("/api/users/profile", input);
}

/**
 * Upload user avatar (multipart/form-data)
 */
export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await fetch("/api/users/profile/avatar", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new ApiError(json.error ?? "Failed to upload avatar", res.status, json.details);
  }
  return json.data;
}

/**
 * Remove user avatar
 */
export async function removeAvatar(): Promise<void> {
  return apiClient.delete<void>("/api/users/profile/avatar");
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
  return apiClient.patch<User>("/api/users/profile/notification-preferences", preferences);
}
