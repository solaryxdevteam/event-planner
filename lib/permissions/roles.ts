/**
 * Role-based Permission Helpers
 *
 * Functions to check user roles and permissions
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

type Role = Database["public"]["Enums"]["role"];

/**
 * Check if user has one of the specified roles
 *
 * @param userId - User ID to check
 * @param roles - Array of allowed roles
 * @returns True if user has one of the specified roles
 */
export async function hasRole(userId: string, roles: Role[]): Promise<boolean> {
  const supabase = await createClient();

  const { data: user, error } = await supabase.from("users").select("role").eq("id", userId).single();

  if (error || !user) {
    return false;
  }

  return roles.includes((user as { role: Role }).role);
}

/**
 * Check if user is a Global Director
 *
 * @param userId - User ID to check
 * @returns True if user is a Global Director
 */
export async function isGlobalDirector(userId: string): Promise<boolean> {
  return hasRole(userId, [UserRole.GLOBAL_DIRECTOR]);
}

/**
 * Check if user has a minimum role level
 * Useful for checking if user has curator-level or above permissions
 *
 * @param userId - User ID to check
 * @param minimumRole - Minimum required role
 * @returns True if user has the minimum role level or higher
 */
export async function hasMinimumRole(userId: string, minimumRole: Role): Promise<boolean> {
  const supabase = await createClient();

  const { data: user, error } = await supabase.from("users").select("role").eq("id", userId).single();

  if (error || !user) {
    return false;
  }

  return getRoleLevel((user as { role: Role }).role) >= getRoleLevel(minimumRole);
}

/**
 * Get numeric level for a role (higher number = higher authority)
 *
 * @param role - Role to get level for
 * @returns Numeric level (1-5)
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    [UserRole.EVENT_PLANNER]: 1,
    [UserRole.CITY_CURATOR]: 2,
    [UserRole.REGIONAL_CURATOR]: 3,
    [UserRole.LEAD_CURATOR]: 4,
    [UserRole.GLOBAL_DIRECTOR]: 5,
  };

  return levels[role];
}

/**
 * Check if user is a curator (any curator level)
 *
 * @param userId - User ID to check
 * @returns True if user is a curator
 */
export async function isCurator(userId: string): Promise<boolean> {
  return hasRole(userId, [
    UserRole.CITY_CURATOR,
    UserRole.REGIONAL_CURATOR,
    UserRole.LEAD_CURATOR,
    UserRole.GLOBAL_DIRECTOR,
  ]);
}

/**
 * Get user's role
 *
 * @param userId - User ID
 * @returns User's role or null if not found
 */
export async function getUserRole(userId: string): Promise<Role | null> {
  const supabase = await createClient();

  const { data: user, error } = await supabase.from("users").select("role").eq("id", userId).single();

  if (error || !user) {
    return null;
  }

  return (user as { role: Role }).role;
}

/**
 * Get role display name
 *
 * @param role - Role enum value
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    [UserRole.EVENT_PLANNER]: "Event Planner",
    [UserRole.CITY_CURATOR]: "City Curator",
    [UserRole.REGIONAL_CURATOR]: "Regional Curator",
    [UserRole.LEAD_CURATOR]: "Lead Curator",
    [UserRole.GLOBAL_DIRECTOR]: "Global Director",
  };

  return displayNames[role];
}
