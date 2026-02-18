/**
 * Users Client Service
 *
 * Client-side service for user operations
 * Makes API calls to /api/users endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { User } from "@/lib/types/database.types";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/users.schema";
import type { PaginatedResponse } from "@/lib/types/api.types";

/**
 * User filters for GET request
 */
export interface UserFilters {
  page?: number;
  limit?: number;
  searchQuery?: string;
  roleFilter?: string | null;
  statusFilter?: "pending" | "active" | "inactive" | null;
}

/**
 * Fetch paginated users
 */
export async function fetchUsers(filters: UserFilters): Promise<PaginatedResponse<User>> {
  return apiClient.get<PaginatedResponse<User>>("/api/users", {
    params: filters as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Create a user
 */
export async function createUser(input: CreateUserInput & { password: string }): Promise<User> {
  return apiClient.post<User>("/api/users", input);
}

/**
 * Update a user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiClient.put<User>(`/api/users/${id}`, input);
}

/**
 * Deactivate a user
 */
export async function deactivateUser(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/users/${id}`);
}

/**
 * Activate a user
 */
export async function activateUser(
  id: string,
  input: {
    role?: string;
    country_id?: string;
    city?: string | null;
    parent_id?: string | null;
  }
): Promise<User> {
  return apiClient.post<User>(`/api/users/${id}/activate`, input);
}

export interface PotentialParentOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: string;
}

/**
 * Get potential parents for a role (paginated, searchable)
 */
export async function fetchPotentialParentsPaginated(
  role: string,
  params?: {
    query?: string;
    page?: number;
    limit?: number;
    excludeUserId?: string;
  }
): Promise<{
  data: PotentialParentOption[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  return apiClient.get<{
    data: PotentialParentOption[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>("/api/users/potential-parents", {
    params: {
      role,
      query: params?.query,
      page: params?.page,
      limit: params?.limit,
      excludeUserId: params?.excludeUserId,
    } as Record<string, string | number | boolean | null | undefined>,
  });
}

/** @deprecated Use fetchPotentialParentsPaginated for search + scroll */
export async function fetchPotentialParents(role: string): Promise<PotentialParentOption[]> {
  const result = await fetchPotentialParentsPaginated(role, { page: 1, limit: 50 });
  return result.data;
}

/**
 * Fetch minimal user info by ID (for combobox selected value display)
 */
export async function fetchUserMinimal(id: string): Promise<PotentialParentOption | null> {
  try {
    return await apiClient.get<PotentialParentOption>(`/api/users/${id}`);
  } catch {
    return null;
  }
}

/**
 * Creator profile for event creator card (avatar, name, email, phone)
 */
export interface CreatorProfileInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

/**
 * Fetch creator profile by user ID (for event creator card).
 * Allowed when current user can view the target user (pyramid visibility).
 */
export async function fetchCreatorProfile(userId: string): Promise<CreatorProfileInfo | null> {
  try {
    return await apiClient.get<CreatorProfileInfo>(`/api/users/${userId}/creator-profile`);
  } catch {
    return null;
  }
}
