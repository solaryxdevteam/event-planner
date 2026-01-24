/**
 * Authentication Server Functions
 * Server-side authentication helpers with role-based access control
 */

import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import type { User as DatabaseUser, Role } from "@/lib/types/database.types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { UserRole } from "@/lib/types/roles";

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
  try {
    const supabase = await createClient();

    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return null;
    }

    // Fetch the corresponding database user
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (dbError || !dbUser) {
      // User is authenticated in Supabase but doesn't exist in our database
      // This shouldn't happen with invitation system
      console.error("User authenticated but not found in database:", supabaseUser.id);
      return null;
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      supabaseUser,
      dbUser,
    };
  } catch (error) {
    // Handle network errors, timeouts, and other connection issues
    if (error instanceof Error) {
      const isNetworkError =
        error.message.includes("timeout") ||
        error.message.includes("fetch failed") ||
        error.message.includes("Connect Timeout") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND");

      if (isNetworkError) {
        console.error("Network error while fetching user:", error.message);
        // Return null to indicate not authenticated, rather than throwing
        // This allows the calling code to handle it appropriately
        return null;
      }
    }
    // For other errors, log and return null
    console.error("Error in getServerUser:", error);
    return null;
  }
}

/**
 * Get the current authenticated user or throw an error
 *
 * Use this when authentication is required
 * @param allowPending - If true, allows pending users to access (default: false)
 * @throws {UnauthorizedError} if not authenticated
 * @throws {ForbiddenError} if user status is not 'active' (unless allowPending is true)
 */
export async function requireAuth(allowPending: boolean = false): Promise<AuthUser> {
  try {
    const user = await getServerUser();

    if (!user) {
      throw new UnauthorizedError("You must be logged in to access this resource");
    }

    // Check user status
    if (user.dbUser.status !== "active") {
      if (user.dbUser.status === "pending") {
        if (allowPending) {
          return user; // Allow pending users if explicitly allowed
        }
        throw new ForbiddenError("Your account is pending activation. Please contact an administrator.");
      }
      if (user.dbUser.status === "inactive") {
        throw new ForbiddenError("Your account has been deactivated. Please contact an administrator.");
      }
    }

    return user;
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    // For network errors, throw UnauthorizedError with a more helpful message
    if (error instanceof Error) {
      const isNetworkError =
        error.message.includes("timeout") ||
        error.message.includes("fetch failed") ||
        error.message.includes("Connect Timeout") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND");

      if (isNetworkError) {
        throw new UnauthorizedError("Unable to verify authentication. Please check your connection and try again.");
      }
    }
    // Re-throw other errors
    throw error;
  }
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
 * Check if user is active (status='active' and is_active=true)
 *
 * @throws {UnauthorizedError} if not authenticated
 * @throws {ForbiddenError} if user is not active
 */
export async function requireActiveUser(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.dbUser.status !== "active" || !user.dbUser.is_active) {
    if (user.dbUser.status === "pending") {
      throw new ForbiddenError("Your account is pending activation. Please contact an administrator.");
    }
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
    [UserRole.EVENT_PLANNER]: 1,
    [UserRole.CITY_CURATOR]: 2,
    [UserRole.REGIONAL_CURATOR]: 3,
    [UserRole.LEAD_CURATOR]: 4,
    [UserRole.GLOBAL_DIRECTOR]: 5,
  };

  const user = await getServerUser();

  if (!user) {
    return false;
  }

  const userRoleLevel = roleHierarchy[user.dbUser.role];
  const minimumRoleLevel = roleHierarchy[minimumRole];

  return userRoleLevel >= minimumRoleLevel;
}
