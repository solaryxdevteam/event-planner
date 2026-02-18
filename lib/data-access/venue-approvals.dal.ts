/**
 * Venue Approvals Data Access Layer (DAL)
 *
 * Pure database operations for venue_approvals table
 * Used for tracking approval chains for venue submissions
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type VenueApproval = Database["public"]["Tables"]["venue_approvals"]["Row"];
type VenueApprovalInsert = Database["public"]["Tables"]["venue_approvals"]["Insert"];
type VenueApprovalUpdate = Database["public"]["Tables"]["venue_approvals"]["Update"];

/**
 * Venue approval with approver and venue information
 */
export interface VenueApprovalWithApprover extends VenueApproval {
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  venue?: {
    id: string;
    short_id: string | null;
    name: string;
    city: string;
    country: string;
    created_at: string;
    creator?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
}

/**
 * Raw venue approval data from Supabase with relations
 */
interface VenueApprovalWithApproverRaw extends VenueApproval {
  approver?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
  venue?: {
    id: string;
    short_id: string | null;
    name: string;
    city: string;
    country: string;
    created_at: string;
    creator?: {
      id: string;
      first_name: string;
      last_name: string | null;
      email: string;
      role: string;
    } | null;
  } | null;
}

/**
 * Get all approvals for a venue
 */
export async function findByVenueId(
  venueId: string,
  includeApprover: boolean = true
): Promise<VenueApprovalWithApprover[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venue_approvals")
    .select(
      includeApprover
        ? `
          *,
          approver:users!venue_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
        : "*"
    )
    .eq("venue_id", venueId)
    .order("sequence_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch venue approvals: ${error.message}`);
  }

  return (data || []).map((approval: VenueApprovalWithApproverRaw) => ({
    ...approval,
    approver: approval.approver
      ? {
          id: approval.approver.id,
          email: approval.approver.email,
          role: approval.approver.role,
          name: approval.approver.last_name
            ? `${approval.approver.first_name} ${approval.approver.last_name}`
            : approval.approver.first_name,
        }
      : undefined,
  })) as VenueApprovalWithApprover[];
}

/**
 * Get pending venue approvals for a specific user
 *
 * @param userId - User ID to fetch approvals for
 * @param includeVenue - Whether to include venue (and creator) information
 * @param includeWaiting - If true, includes "waiting" status (for Global Directors)
 */
export async function findPendingForUser(
  userId: string,
  includeVenue: boolean = true,
  includeWaiting: boolean = false
): Promise<VenueApprovalWithApprover[]> {
  const supabase = await createClient();

  let query = supabase
    .from("venue_approvals")
    .select(
      includeVenue
        ? `
          *,
          approver:users!venue_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          venue:venues!venue_approvals_venue_id_fkey (
            id,
            short_id,
            name,
            city,
            country,
            created_at,
            creator:users!venues_creator_id_fkey (
              id,
              first_name,
              last_name,
              email,
              role
            )
          )
        `
        : `
          *,
          approver:users!venue_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
    )
    .eq("approver_id", userId);

  if (includeWaiting) {
    query = query.in("status", ["pending", "waiting"]);
  } else {
    query = query.eq("status", "pending");
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending venue approvals: ${error.message}`);
  }

  return (data || []).map((approval: VenueApprovalWithApproverRaw) => ({
    ...approval,
    approver: approval.approver
      ? {
          id: approval.approver.id,
          email: approval.approver.email,
          role: approval.approver.role,
          name: approval.approver.last_name
            ? `${approval.approver.first_name} ${approval.approver.last_name}`
            : approval.approver.first_name,
        }
      : undefined,
    venue: approval.venue
      ? {
          ...approval.venue,
          creator: approval.venue.creator
            ? {
                id: approval.venue.creator.id,
                email: approval.venue.creator.email,
                role: approval.venue.creator.role,
                name: approval.venue.creator.last_name
                  ? `${approval.venue.creator.first_name} ${approval.venue.creator.last_name}`
                  : approval.venue.creator.first_name,
              }
            : undefined,
        }
      : undefined,
  })) as VenueApprovalWithApprover[];
}

/**
 * Update approval status
 */
export async function updateStatus(
  id: string,
  status: "waiting" | "pending" | "approved" | "rejected",
  comment?: string
): Promise<VenueApproval> {
  const supabase = await createClient();

  const updateData: VenueApprovalUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  const { data, error } = await supabase
    .from("venue_approvals")
    // @ts-expect-error - Supabase type inference
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update venue approval status: ${error.message}`);
  }

  return data;
}

/**
 * Create approval chain for a venue (same hierarchy as events: buildApprovalChain(venue.creator_id))
 */
export async function createChain(venueId: string, approverIds: string[]): Promise<VenueApproval[]> {
  const supabase = await createClient();

  const approvals: VenueApprovalInsert[] = approverIds.map((approverId, index) => ({
    venue_id: venueId,
    approver_id: approverId,
    sequence_order: index + 1,
    status: index === 0 ? "pending" : "waiting",
    comment: null,
  }));

  const { data, error } = await supabase
    .from("venue_approvals")
    // @ts-expect-error - Supabase type inference
    .insert(approvals)
    .select();

  if (error) {
    throw new Error(`Failed to create venue approval chain: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete approval chain for a venue (e.g. when venue is deleted)
 */
export async function deleteByVenueId(venueId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("venue_approvals").delete().eq("venue_id", venueId);

  if (error) {
    throw new Error(`Failed to delete venue approval chain: ${error.message}`);
  }
}

/**
 * Get the next approver in the chain after current sequence
 */
export async function getNextApprover(venueId: string, currentSequence: number): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venue_approvals")
    .select("approver_id")
    .eq("venue_id", venueId)
    .eq("sequence_order", currentSequence + 1)
    .maybeSingle<{ approver_id: string }>();

  if (error || !data) {
    return null;
  }

  return data.approver_id;
}

/**
 * Check if current sequence is the last approver in the chain
 */
export async function isLastApprover(venueId: string, currentSequence: number): Promise<boolean> {
  const next = await getNextApprover(venueId, currentSequence);
  return next === null;
}
