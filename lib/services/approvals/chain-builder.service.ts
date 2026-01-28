/**
 * Approval Chain Builder Service
 *
 * Business logic for building approval chains based on user hierarchy
 * and approval configuration.
 *
 * NOTE: This logic was originally in database functions but moved to backend
 * for better maintainability, testability, and business logic separation.
 */

import { createClient } from "@/lib/supabase/server";
import { getPathToRoot } from "@/lib/services/users/hierarchy.service";
import type { Database } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

type Role = Database["public"]["Enums"]["role"];
type ApprovalConfig = Database["public"]["Tables"]["approval_configs"]["Row"];

/**
 * Build approval chain for an event creator
 *
 * Walks up the user hierarchy from creator to root, including only
 * roles that are required in the approval_configs.
 *
 * @param creatorUserId - The user creating the event/modification/cancellation
 * @returns Array of approver user IDs in sequence order (first to last)
 *
 * @example
 * // Event Planner creates event
 * // Their hierarchy: Planner → City Curator → Regional Curator → Lead Curator → Global Director
 * // Config: city_curator=true, regional_curator=true, lead=true, global=true
 * const chain = await buildApprovalChain(plannerId);
 * // Returns: [cityCuratorId, regionalCuratorId, leadCuratorId, globalDirectorId]
 */
export async function buildApprovalChain(creatorUserId: string): Promise<string[]> {
  // Get the latest approval configuration
  const config = await getApprovalConfig();

  // Get the path from creator up to root
  const path = await getPathToRoot(creatorUserId);

  // Remove the creator (first element) - they don't approve their own submission
  const potentialApprovers = path.slice(1);

  // Filter to only include roles that are required in the config
  const approvers = potentialApprovers.filter((user) => {
    const roleKey = user.role as keyof typeof config.config_data;
    return config.config_data[roleKey] === true;
  });

  // Return just the IDs in sequence order
  return approvers.map((user) => user.id);
}

/**
 * Get the current approval configuration
 *
 * @returns The latest approval config or default if none exists
 */
export async function getApprovalConfig(): Promise<ApprovalConfig> {
  const supabase = await createClient();

  const { data: configs, error } = await supabase
    .from("approval_configs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch approval config: ${error.message}`);
  }

  if (!configs || configs.length === 0) {
    // Return default config
    return {
      id: "default",
      config_data: {
        event_planner: false,
        city_curator: true,
        regional_curator: true,
        lead_curator: true,
        global_director: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return configs[0];
}

/**
 * Update the approval configuration (Global Director only)
 *
 * @param newConfig - New configuration specifying which roles are required
 * @returns The created config record
 */
export async function updateApprovalConfig(newConfig: Record<Role, boolean>): Promise<ApprovalConfig> {
  const supabase = await createClient();

  // Validate that all roles are present
  const requiredRoles: Role[] = [
    UserRole.EVENT_PLANNER,
    UserRole.CITY_CURATOR,
    UserRole.REGIONAL_CURATOR,
    UserRole.LEAD_CURATOR,
    UserRole.GLOBAL_DIRECTOR,
  ];

  for (const role of requiredRoles) {
    if (!(role in newConfig)) {
      throw new Error(`Missing configuration for role: ${role}`);
    }
  }

  const { data, error } = await supabase
    .from("approval_configs")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert({
      config_data: newConfig as unknown as ApprovalConfig["config_data"],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update approval config: ${error.message}`);
  }

  return data;
}

/**
 * Get approval chain with user details (for display)
 *
 * @param creatorUserId - The user creating the event
 * @returns Array of approver details with user info
 */
export async function getApprovalChainWithDetails(creatorUserId: string): Promise<ApprovalChainStep[]> {
  const supabase = await createClient();

  // Build the chain of IDs
  const approverIds = await buildApprovalChain(creatorUserId);

  if (approverIds.length === 0) {
    return [];
  }

  // Fetch user details for all approvers
  const { data: users, error } = (await supabase
    .from("users")
    .select("id, name, email, role")
    .in("id", approverIds)) as {
    data: { id: string; name: string; email: string; role: Role }[] | null;
    error: Error | null;
  };

  if (error) {
    throw new Error(`Failed to fetch approver details: ${error.message}`);
  }

  if (!users) {
    return [];
  }

  // Map back to the original order with sequence numbers
  return approverIds.map((id, index) => {
    const user = users.find((u) => u.id === id);
    if (!user) {
      throw new Error(`Approver not found: ${id}`);
    }

    return {
      sequence_order: index + 1,
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  });
}

/**
 * Validate that a user has approval authority for an event
 *
 * @param userId - User to check
 * @param eventCreatorId - Creator of the event
 * @returns true if user is in the approval chain for this creator
 */
export async function canApprove(userId: string, eventCreatorId: string): Promise<boolean> {
  const approverIds = await buildApprovalChain(eventCreatorId);
  return approverIds.includes(userId);
}

/**
 * Get the next approver in the chain after current approver approves
 *
 * @param eventId - The event being approved
 * @param currentSequence - Current approver's sequence number
 * @param approvalType - The approval type (event, modification, cancellation, report)
 * @returns Next approver's user ID or null if this was the last approver
 */
export async function getNextApprover(
  eventId: string,
  currentSequence: number,
  approvalType: "event" | "modification" | "cancellation" | "report" = "event"
): Promise<string | null> {
  const supabase = await createClient();

  const { data: nextApproval, error } = await supabase
    .from("event_approvals")
    .select("approver_id")
    .eq("event_id", eventId)
    .eq("approval_type", approvalType)
    .eq("sequence_order", currentSequence + 1)
    .single<{ approver_id: string }>();

  if (error || !nextApproval) {
    return null; // Last approver
  }

  return nextApproval.approver_id;
}

/**
 * Check if user is the last approver in the chain
 *
 * @param eventId - The event being approved
 * @param currentSequence - Current approver's sequence number
 * @param approvalType - The approval type (event, modification, cancellation, report)
 * @returns true if this is the last approver
 */
export async function isLastApprover(
  eventId: string,
  currentSequence: number,
  approvalType: "event" | "modification" | "cancellation" | "report" = "event"
): Promise<boolean> {
  const nextApprover = await getNextApprover(eventId, currentSequence, approvalType);
  return nextApprover === null;
}

// Type definitions
export interface ApprovalChainStep {
  sequence_order: number;
  user_id: string;
  name: string;
  email: string;
  role: Role;
}
