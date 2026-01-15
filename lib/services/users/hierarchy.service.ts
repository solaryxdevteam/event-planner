/**
 * Hierarchy Service
 *
 * Business logic for user hierarchy operations including pyramid visibility
 * and subordinate management.
 *
 * NOTE: This logic was originally in database functions but moved to backend
 * for better maintainability, testability, and business logic separation.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type Role = Database["public"]["Enums"]["role"];

/**
 * Get all subordinate user IDs for a given user (including the user themselves)
 *
 * This implements the pyramid visibility pattern where users can see:
 * - Their own data
 * - Data from all subordinates (recursively down the hierarchy)
 *
 * @param userId - The user ID to get subordinates for
 * @returns Array of user IDs (including the original user)
 *
 * @example
 * // Regional Curator sees: themselves + all City Curators + all Event Planners below them
 * const visibleUserIds = await getSubordinateUserIds(regionalCuratorId);
 * // Returns: [regionalCuratorId, cityCurator1Id, cityCurator2Id, planner1Id, planner2Id, ...]
 */
export async function getSubordinateUserIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  // Fetch all active users (we'll build the tree in memory)
  const { data: allUsers, error } = await supabase
    .from("users")
    .select("id, parent_id, is_active")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!allUsers) {
    return [userId];
  }

  // Recursive function to collect all subordinates
  const collectSubordinates = (currentUserId: string, visited = new Set<string>()): string[] => {
    // Prevent infinite loops (shouldn't happen but safety first)
    if (visited.has(currentUserId)) {
      return [];
    }
    visited.add(currentUserId);

    // Start with the current user
    const subordinates = [currentUserId];

    // Find all direct children
    const children = allUsers.filter((u) => u.parent_id === currentUserId);

    // Recursively collect children's subordinates
    for (const child of children) {
      subordinates.push(...collectSubordinates(child.id, visited));
    }

    return subordinates;
  };

  return collectSubordinates(userId);
}

/**
 * Get the complete hierarchy tree structure
 *
 * @returns Tree structure with all users organized by hierarchy
 */
export async function getHierarchyTree(): Promise<HierarchyNode[]> {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, email, role, parent_id, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!users) {
    return [];
  }

  // Build the tree structure
  const buildTree = (parentId: string | null): HierarchyNode[] => {
    return users
      .filter((u) => u.parent_id === parentId)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        children: buildTree(user.id),
      }));
  };

  // Start from root (users with no parent)
  return buildTree(null);
}

/**
 * Validate that setting parent_id won't create circular reference
 *
 * @param userId - The user being modified
 * @param newParentId - The proposed new parent
 * @returns true if valid, false if would create circular reference
 */
export async function validateParentAssignment(
  userId: string,
  newParentId: string | null
): Promise<{ valid: boolean; error?: string }> {
  if (!newParentId) {
    return { valid: true };
  }

  // Can't be your own parent
  if (userId === newParentId) {
    return { valid: false, error: "User cannot be their own parent" };
  }

  const supabase = await createClient();

  // Get all users
  const { data: users, error } = await supabase.from("users").select("id, parent_id").eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!users) {
    return { valid: true };
  }

  // Build parent map
  const parentMap = new Map(users.map((u) => [u.id, u.parent_id]));

  // Walk up from newParentId to see if we encounter userId
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return { valid: false, error: "Circular reference detected in hierarchy" };
    }
    visited.add(currentId);

    if (currentId === userId) {
      return { valid: false, error: "Would create circular reference: proposed parent is a subordinate" };
    }

    currentId = parentMap.get(currentId) || null;
  }

  return { valid: true };
}

/**
 * Get direct children of a user
 *
 * @param userId - The parent user ID
 * @returns Array of direct child users
 */
export async function getDirectChildren(userId: string): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("parent_id", userId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch children: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the path from a user up to the root (Global Director)
 *
 * @param userId - Starting user ID
 * @returns Array of users from the starting user up to root
 */
export async function getPathToRoot(userId: string): Promise<User[]> {
  const supabase = await createClient();

  const path: User[] = [];
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId) {
    // Prevent infinite loops
    if (visited.has(currentId)) {
      throw new Error("Circular reference detected in user hierarchy");
    }
    visited.add(currentId);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentId)
      .eq("is_active", true)
      .single();

    if (error || !user) {
      break;
    }

    path.push(user);
    currentId = user.parent_id;
  }

  return path;
}

/**
 * Get role level for hierarchy comparisons
 * Higher number = higher authority
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    event_planner: 1,
    city_curator: 2,
    regional_curator: 3,
    lead_curator: 4,
    global_director: 5,
  };
  return levels[role];
}

/**
 * Check if user1 is above user2 in hierarchy
 *
 * @param user1Id - First user
 * @param user2Id - Second user
 * @returns true if user1 is an ancestor of user2
 */
export async function isAncestorOf(user1Id: string, user2Id: string): Promise<boolean> {
  const subordinates = await getSubordinateUserIds(user1Id);
  return subordinates.includes(user2Id) && user1Id !== user2Id;
}

// Type definitions
export interface HierarchyNode {
  id: string;
  name: string;
  email: string;
  role: Role;
  children: HierarchyNode[];
}
