/**
 * User Data Access Layer (DAL)
 *
 * Pure database operations for users table
 * No business logic - just CRUD operations
 *
 * IMPORTANT: Authorization is handled by passing subordinateUserIds
 * from the Service Layer. No RLS is used in this application.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type Role = Database["public"]["Enums"]["role"];

/**
 * Get all users filtered by subordinate user IDs
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param options - Additional query options
 */
export async function findAll(
  subordinateUserIds: string[],
  options?: {
    includeInactive?: boolean;
    roleFilter?: Role;
  }
): Promise<User[]> {
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select("*")
    .in("id", subordinateUserIds) // Backend authorization filter
    .order("first_name", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  if (options?.roleFilter) {
    query = query.eq("role", options.roleFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single user by ID (with authorization check)
 *
 * @param id - User ID
 * @param subordinateUserIds - Array of user IDs that the current user can see
 */
export async function findById(id: string, subordinateUserIds: string[]): Promise<User | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .in("id", subordinateUserIds) // Backend authorization filter
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data;
}

/**
 * Get users by role
 *
 * @param role - User role to filter by
 * @param subordinateUserIds - Array of user IDs that the current user can see
 */
export async function findByRole(role: Role, subordinateUserIds: string[]): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", role)
    .in("id", subordinateUserIds) // Backend authorization filter
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch users by role: ${error.message}`);
  }

  return data || [];
}

/**
 * Get direct children of a user (users where parent_id = userId)
 *
 * @param parentId - Parent user ID
 */
export async function findChildren(parentId: string): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch children: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new user
 *
 * @param user - User data to insert
 */
export async function insert(user: UserInsert): Promise<User> {
  const supabase = await createClient();

  // @ts-expect-error - Supabase type inference issue with Database types
  const { data, error } = await supabase.from("users").insert(user).select().single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing user
 *
 * @param id - User ID to update
 * @param updates - Fields to update
 */
export async function update(id: string, updates: UserUpdate): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete a user (set is_active = false and status = 'inactive')
 *
 * @param id - User ID to deactivate
 */
export async function deactivate(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      is_active: false,
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to deactivate user: ${error.message}`);
  }
}

/**
 * Update user status
 *
 * @param id - User ID to update
 * @param status - New status (pending, active, inactive)
 */
export async function updateStatus(id: string, status: "pending" | "active" | "inactive"): Promise<User> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }

  return data;
}

/**
 * Find user by email (returns first match). Used for uniqueness checks e.g. change-email.
 */
export async function findByEmail(email: string): Promise<User | null> {
  const supabase = await createClient();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase.from("users").select("*").eq("email", normalized).limit(1).maybeSingle();

  if (error) throw new Error(`Failed to find user by email: ${error.message}`);
  return data as User | null;
}

/**
 * Search users by name or email (filtered by subordinate user IDs)
 *
 * @param searchQuery - Search term for name or email
 * @param subordinateUserIds - Array of user IDs that the current user can see
 */
export async function search(searchQuery: string, subordinateUserIds: string[]): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", subordinateUserIds) // Backend authorization filter
    .eq("is_active", true)
    .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    .order("first_name", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all users (without filtering) - Only for Global Director
 * Used in user management UI
 */
export async function findAllUnfiltered(options?: { includeInactive?: boolean }): Promise<User[]> {
  const supabase = await createClient();

  let query = supabase.from("users").select("*").order("first_name", { ascending: true });

  if (!options?.includeInactive) {
    // Include pending users even if inactive, so they can be activated
    // Include users where: (is_active = true) OR (status = 'pending')
    query = query.or("is_active.eq.true,status.eq.pending");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch all users: ${error.message}`);
  }

  return data || [];
}

/**
 * Get paginated users with search and filters - Only for Global Director
 * Used in user management UI with pagination
 *
 * @param options - Pagination and filter options
 * @returns Paginated users and total count
 */
export async function findAllUnfilteredPaginated(options?: {
  page?: number;
  limit?: number;
  searchQuery?: string;
  roleFilter?: Role | null;
  statusFilter?: "pending" | "active" | "inactive" | null;
  includeInactive?: boolean;
}): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  // Build base query for counting total (head: true means we only get count, not data)
  let countQuery = supabase.from("users").select("*", { count: "exact", head: true });

  // Build query for fetching data (newest first)
  let dataQuery = supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  // Include pending users even if inactive, so they can be activated
  // Only filter out inactive users if they're not pending
  if (!options?.includeInactive) {
    // Include users where: (is_active = true) OR (status = 'pending')
    // This ensures pending users are visible even though they're inactive
    // Using PostgREST OR syntax: column1.eq.value1,column2.eq.value2
    countQuery = countQuery.or("is_active.eq.true,status.eq.pending");
    dataQuery = dataQuery.or("is_active.eq.true,status.eq.pending");
  }

  if (options?.roleFilter) {
    countQuery = countQuery.eq("role", options.roleFilter);
    dataQuery = dataQuery.eq("role", options.roleFilter);
  }

  if (options?.statusFilter) {
    countQuery = countQuery.eq("status", options.statusFilter);
    dataQuery = dataQuery.eq("status", options.statusFilter);
  }

  // Apply search query
  if (options?.searchQuery) {
    const searchTerm = options.searchQuery;
    countQuery = countQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
    dataQuery = dataQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
  }

  // Execute both queries
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    throw new Error(`Failed to count users: ${countResult.error.message}`);
  }

  if (dataResult.error) {
    throw new Error(`Failed to fetch users: ${dataResult.error.message}`);
  }

  return {
    data: dataResult.data || [],
    total: countResult.count || 0,
  };
}

/**
 * Get paginated users filtered by subordinate user IDs (pyramid visibility)
 * Used for non-Global Director roles to see only their pyramid
 *
 * @param subordinateUserIds - Array of user IDs the requester can see (self + subordinates)
 * @param options - Pagination and filter options
 * @returns Paginated users and total count
 */
export async function findAllPaginated(
  subordinateUserIds: string[],
  options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    roleFilter?: Role | null;
    statusFilter?: "pending" | "active" | "inactive" | null;
    includeInactive?: boolean;
  }
): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  if (subordinateUserIds.length === 0) {
    return { data: [], total: 0 };
  }

  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  let countQuery = supabase.from("users").select("*", { count: "exact", head: true }).in("id", subordinateUserIds);

  let dataQuery = supabase
    .from("users")
    .select("*")
    .in("id", subordinateUserIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!options?.includeInactive) {
    countQuery = countQuery.or("is_active.eq.true,status.eq.pending");
    dataQuery = dataQuery.or("is_active.eq.true,status.eq.pending");
  }

  if (options?.roleFilter) {
    countQuery = countQuery.eq("role", options.roleFilter);
    dataQuery = dataQuery.eq("role", options.roleFilter);
  }

  if (options?.statusFilter) {
    countQuery = countQuery.eq("status", options.statusFilter);
    dataQuery = dataQuery.eq("status", options.statusFilter);
  }

  if (options?.searchQuery) {
    const searchTerm = options.searchQuery;
    countQuery = countQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
    dataQuery = dataQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
    );
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    throw new Error(`Failed to count users: ${countResult.error.message}`);
  }

  if (dataResult.error) {
    throw new Error(`Failed to fetch users: ${dataResult.error.message}`);
  }

  return {
    data: dataResult.data || [],
    total: countResult.count || 0,
  };
}

/**
 * Get potential parent users by roles with optional search and pagination
 * Used for Reports To combobox (search + scroll-to-load)
 */
export async function findPotentialParentsPaginated(
  validRoles: Role[],
  options?: {
    searchQuery?: string;
    page?: number;
    limit?: number;
    excludeUserId?: string;
  }
): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 50);
  const offset = (page - 1) * limit;

  if (validRoles.length === 0) {
    return { data: [], total: 0 };
  }

  let countQuery = supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .in("role", validRoles)
    .eq("is_active", true);

  let dataQuery = supabase
    .from("users")
    .select("id, first_name, last_name, email, role")
    .in("role", validRoles)
    .eq("is_active", true)
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (options?.excludeUserId) {
    countQuery = countQuery.neq("id", options.excludeUserId);
    dataQuery = dataQuery.neq("id", options.excludeUserId);
  }

  if (options?.searchQuery?.trim()) {
    const term = options.searchQuery.trim();
    const or = `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`;
    countQuery = countQuery.or(or);
    dataQuery = dataQuery.or(or);
  }

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    throw new Error(`Failed to count potential parents: ${countResult.error.message}`);
  }
  if (dataResult.error) {
    throw new Error(`Failed to fetch potential parents: ${dataResult.error.message}`);
  }

  return {
    data: (dataResult.data || []) as User[],
    total: countResult.count || 0,
  };
}
