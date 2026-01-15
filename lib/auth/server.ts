/**
 * Authentication Server Functions
 * Server-side authentication helpers with role-based access control
 */

import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import type { User as DatabaseUser, Role } from "@/lib/types/database.types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Extended user type that includes database user data
 */
export interface AuthUser {
  id: string;
  email: string;
  supabaseUser: SupabaseUser;
  dbUser: DatabaseUser;
}

/**
 * Get the current authenticated Supabase user
 * Returns null if not authenticated
 *
 * Use this when authentication is optional
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    return null;
  }

  // Fetch the corresponding database user
  const { data: dbUser, error: dbError } = await supabase.from("users").select("*").eq("id", supabaseUser.id).single();

  if (dbError || !dbUser) {
    // User is authenticated in Supabase but doesn't exist in our database
    // This can happen if the user was just created via magic link
    // You might want to handle this differently based on your app's needs
    console.error("User authenticated but not found in database:", supabaseUser.id);
    return null;
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    supabaseUser,
    dbUser,
  };
}

/**
 * Get the current authenticated user or throw an error
 *
 * Use this when authentication is required
 * @throws {UnauthorizedError} if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser();

  if (!user) {
    throw new UnauthorizedError("You must be logged in to access this resource");
  }

  return user;
}

/**
 * Check if the current user has one of the required roles
 *
 * @param requiredRoles - Array of roles that are allowed
 * @throws {UnauthorizedError} if not authenticated
 * @throws {ForbiddenError} if user doesn't have required role
 */
export async function requireRole(requiredRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!requiredRoles.includes(user.dbUser.role)) {
    throw new ForbiddenError(`This action requires one of the following roles: ${requiredRoles.join(", ")}`);
  }

  return user;
}

/**
 * Check if user has a specific role or higher in the hierarchy
 *
 * Role hierarchy (lowest to highest):
 * event_planner < city_curator < regional_curator < lead_curator < global_director
 *
 * @param minimumRole - Minimum required role
 * @throws {UnauthorizedError} if not authenticated
 * @throws {ForbiddenError} if user doesn't meet minimum role requirement
 */
export async function requireMinimumRole(minimumRole: Role): Promise<AuthUser> {
  const roleHierarchy: Record<Role, number> = {
    event_planner: 1,
    city_curator: 2,
    regional_curator: 3,
    lead_curator: 4,
    global_director: 5,
  };

  const user = await requireAuth();

  const userRoleLevel = roleHierarchy[user.dbUser.role];
  const minimumRoleLevel = roleHierarchy[minimumRole];

  if (userRoleLevel < minimumRoleLevel) {
    throw new ForbiddenError(`This action requires at least ${minimumRole} role. Your role: ${user.dbUser.role}`);
  }

  return user;
}

/**
 * Check if user is active
 *
 * @throws {UnauthorizedError} if not authenticated
 * @throws {ForbiddenError} if user is not active
 */
export async function requireActiveUser(): Promise<AuthUser> {
  const user = await requireAuth();

  if (!user.dbUser.is_active) {
    throw new ForbiddenError("Your account has been deactivated. Please contact an administrator.");
  }

  return user;
}

/**
 * Helper to get user's role
 * Returns null if not authenticated
 */
export async function getUserRole(): Promise<Role | null> {
  const user = await getServerUser();
  return user?.dbUser.role ?? null;
}

/**
 * Helper to check if user has permission (role check without throwing)
 * Returns false if not authenticated or doesn't have permission
 */
export async function hasRole(requiredRoles: Role[]): Promise<boolean> {
  const user = await getServerUser();

  if (!user) {
    return false;
  }

  return requiredRoles.includes(user.dbUser.role);
}

/**
 * Helper to check if user meets minimum role requirement (without throwing)
 * Returns false if not authenticated or doesn't meet requirement
 */
export async function hasMinimumRole(minimumRole: Role): Promise<boolean> {
  const roleHierarchy: Record<Role, number> = {
    event_planner: 1,
    city_curator: 2,
    regional_curator: 3,
    lead_curator: 4,
    global_director: 5,
  };

  const user = await getServerUser();

  if (!user) {
    return false;
  }

  const userRoleLevel = roleHierarchy[user.dbUser.role];
  const minimumRoleLevel = roleHierarchy[minimumRole];

  return userRoleLevel >= minimumRoleLevel;
}
