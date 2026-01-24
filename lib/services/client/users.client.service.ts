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
    state_id?: string | null;
    city?: string | null;
    parent_id?: string | null;
  }
): Promise<User> {
  return apiClient.post<User>(`/api/users/${id}/activate`, input);
}

/**
 * Get potential parents for a role
 */
export async function fetchPotentialParents(
  role: string
): Promise<Pick<User, "id" | "first_name" | "last_name" | "email" | "role">[]> {
  return apiClient.get<Pick<User, "id" | "first_name" | "last_name" | "email" | "role">[]>(
    "/api/users/potential-parents",
    {
      params: { role } as Record<string, string | number | boolean | null | undefined>,
    }
  );
}
