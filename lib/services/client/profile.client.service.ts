/**
 * Profile Client Service
 *
 * Client-side service for user profile operations
 * Makes API calls to /api/users/profile endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { User } from "@/lib/types/database.types";
import type { UpdateProfileInput } from "@/lib/validation/profile.schema";

/**
 * Fetch current user profile
 */
export async function fetchProfile(): Promise<User> {
  return apiClient.get<User>("/api/users/profile");
}

/**
 * Update user profile
 */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  return apiClient.put<User>("/api/users/profile", input);
}
