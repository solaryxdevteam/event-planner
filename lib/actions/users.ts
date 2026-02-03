/**
 * User Server Actions
 *
 * Server actions for user management operations
 * Called from client components via form submissions or mutations
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/server";
import * as userService from "@/lib/services/users/user.service";
import * as hierarchyService from "@/lib/services/users/hierarchy.service";
import {
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  globalDirectorPasswordSchema,
  type UpdateUserInput,
} from "@/lib/validation/users.schema";
import type { ActionResponse, PaginatedResponse } from "@/lib/types/api.types";
import { handleAsync } from "@/lib/utils/response";
import type { Database } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

type User = Database["public"]["Tables"]["users"]["Row"];

/**
 * Get all users (Global Director only)
 * @deprecated Use getUsersPaginated for better performance with large datasets
 */
export async function getUsers(): Promise<ActionResponse<User[]>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    return userService.getAllUsers(user.id);
  }, "getUsers");
}

/**
 * Get paginated users with search and filters (Global Director only)
 *
 * @param params - Pagination and filter parameters
 * @returns Paginated users response
 */
export async function getUsersPaginated(params?: {
  page?: number;
  limit?: number;
  searchQuery?: string;
  roleFilter?: string | null;
  statusFilter?: "pending" | "active" | "inactive" | null;
}): Promise<ActionResponse<PaginatedResponse<User>>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);

    const page = params?.page || 1;
    const limit = params?.limit || 10;

    const result = await userService.getAllUsersPaginated(user.id, {
      page,
      limit,
      searchQuery: params?.searchQuery,
      roleFilter: params?.roleFilter,
      statusFilter: params?.statusFilter,
    });

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }, "getUsersPaginated");
}

/**
 * Create a new user directly (with password)
 * User is immediately active
 *
 * @param formData - Form data or CreateUserInput object with password
 */
export async function createUserDirectly(
  formData: FormData | (CreateUserInput & { password: string })
): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);

    // Parse form data or use object directly
    let data: CreateUserInput;
    let password: string;

    if (formData instanceof FormData) {
      data = {
        email: formData.get("email") as string,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string | null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: formData.get("role") as any,
        parent_id: formData.get("parent_id") as string | null,
        country_id: formData.get("country_id") as string | undefined,
        state_id: formData.get("state_id") as string | null | undefined,
        city: formData.get("city") as string | null | undefined,
        phone: formData.get("phone") as string | null | undefined,
        company: formData.get("company") as string | null | undefined,
      };
      password = formData.get("password") as string;
    } else {
      data = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        parent_id: formData.parent_id,
        country_id: formData.country_id,
        state_id: formData.state_id,
        city: formData.city,
        phone: formData.phone,
        company: formData.company,
      };
      password = formData.password;
    }

    // Validate input
    const validated = createUserSchema.parse(data);

    if (!password || password.length < 8) {
      throw new Error("Password is required and must be at least 8 characters");
    }

    // Create user directly with password
    const newUser = await userService.createUserDirectly(user.id, validated, password);

    // Revalidate users page
    revalidatePath("/users");
    revalidatePath("/admin/users");

    return newUser;
  }, "createUserDirectly");
}

/**
 * Create a new user (legacy - kept for backward compatibility)
 * Now requires invitation system
 *
 * @param formData - Form data or CreateUserInput object
 * @deprecated Use createUserDirectly with password instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createUser(formData: FormData | CreateUserInput): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    throw new Error("Direct user creation requires a password. Use createUserDirectly instead.");
  }, "createUser");
}

/**
 * Update an existing user
 *
 * @param userId - ID of user to update
 * @param formData - Form data or UpdateUserInput object
 */
export async function updateUser(userId: string, formData: FormData | UpdateUserInput): Promise<ActionResponse<User>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);

    // Parse form data or use object directly
    let data: Partial<UpdateUserInput>;
    if (formData instanceof FormData) {
      data = {};
      const email = formData.get("email");
      const first_name = formData.get("first_name");
      const last_name = formData.get("last_name");
      const role = formData.get("role");
      const parent_id = formData.get("parent_id");
      const country_id = formData.get("country_id");
      const state_id = formData.get("state_id");
      const city = formData.get("city");
      const is_active = formData.get("is_active");

      if (email) data.email = email as string;
      if (first_name) data.first_name = first_name as string;
      if (last_name) data.last_name = last_name as string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (role) data.role = role as any;
      if (parent_id !== null) data.parent_id = parent_id as string | null;
      if (country_id) data.country_id = country_id as string;
      if (state_id !== null) data.state_id = state_id as string | null;
      if (city !== null) data.city = city as string | null;
      if (is_active !== null) data.is_active = is_active === "true";
    } else {
      data = formData;
    }

    // Validate input
    const validated = updateUserSchema.parse(data as UpdateUserInput);

    // Update user
    const updatedUser = await userService.updateUser(user.id, userId, validated);

    // Revalidate users page
    revalidatePath("/users");
    revalidatePath("/admin/users");
    revalidatePath(`/users/${userId}`);

    return updatedUser;
  }, "updateUser");
}

/**
 * Deactivate a user (soft delete)
 *
 * @param userId - ID of user to deactivate
 */
export async function deactivateUser(userId: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);

    // Validate input
    deactivateUserSchema.parse({ userId });

    // Deactivate user
    await userService.deactivateUser(user.id, userId);

    // Revalidate users page
    revalidatePath("/users");
    revalidatePath("/admin/users");

    return undefined;
  }, "deactivateUser");
}

/**
 * Check Global Director password
 * Used for confirmation when creating a Global Director
 *
 * @param password - Password to verify
 */
export async function checkGlobalDirectorPassword(password: string): Promise<ActionResponse<boolean>> {
  return handleAsync(async () => {
    await requireRole(["global_director"]);

    // Validate input
    const validated = globalDirectorPasswordSchema.parse({ password });

    return userService.checkGlobalDirectorPassword(validated.password);
  }, "checkGlobalDirectorPassword");
}

/**
 * Get user hierarchy tree
 * Returns complete tree structure for visualization
 */
export async function getUserHierarchy(): Promise<ActionResponse<hierarchyService.HierarchyNode[]>> {
  return handleAsync(async () => {
    await requireAuth();
    return hierarchyService.getHierarchyTree();
  }, "getUserHierarchy");
}

/**
 * Get users that can be selected as parent for a given role
 * Used in user creation/edit forms
 *
 * @param role - Role of the user being created/edited
 */
export async function getPotentialParents(
  role: string
): Promise<ActionResponse<Pick<User, "id" | "first_name" | "last_name" | "email" | "role">[]>> {
  return handleAsync(async () => {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);

    // Get all users
    const allUsers = await userService.getAllUsers(user.id);

    // Filter potential parents based on role hierarchy
    // Event Planner → can have City Curator or above as parent
    // City Curator → can have Regional Curator or above as parent
    // Regional Curator → can have Lead Curator or above as parent
    // Lead Curator → can have Global Director as parent
    // Global Director → cannot have parent

    const roleHierarchy: Record<string, string[]> = {
      [UserRole.EVENT_PLANNER]: [
        UserRole.CITY_CURATOR,
        UserRole.REGIONAL_CURATOR,
        UserRole.LEAD_CURATOR,
        UserRole.GLOBAL_DIRECTOR,
      ],
      [UserRole.CITY_CURATOR]: [UserRole.REGIONAL_CURATOR, UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
      [UserRole.REGIONAL_CURATOR]: [UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
      [UserRole.LEAD_CURATOR]: [UserRole.GLOBAL_DIRECTOR],
      [UserRole.GLOBAL_DIRECTOR]: [],
    };

    const validParentRoles = roleHierarchy[role] || [];

    return allUsers
      .filter((u) => validParentRoles.includes(u.role))
      .map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        role: u.role,
      }));
  }, "getPotentialParents");
}
