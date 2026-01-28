/**
 * Event Approvals Data Access Layer (DAL)
 *
 * Pure database operations for event_approvals table
 * Used for tracking approval chains and approval status
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type EventApproval = Database["public"]["Tables"]["event_approvals"]["Row"];
type EventApprovalInsert = Database["public"]["Tables"]["event_approvals"]["Insert"];
type EventApprovalUpdate = Database["public"]["Tables"]["event_approvals"]["Update"];

/**
 * Event approval with approver information
 */
export interface EventApprovalWithApprover extends EventApproval {
  approver?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  event?: {
    id: string;
    short_id?: string | null;
    title: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
    created_at?: string;
    creator?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    venue?: {
      id: string;
      name: string;
      address: string;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
    budget_amount?: string | null;
    budget_currency?: string | null;
    expected_attendance?: number | null;
    description?: string | null;
  };
}

/**
 * Raw approval data from Supabase with approver relation
 */
interface EventApprovalWithApproverRaw extends EventApproval {
  approver?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
  event?: {
    id: string;
    short_id?: string | null;
    title: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
    created_at?: string;
    description?: string | null;
    budget_amount?: string | null;
    budget_currency?: string | null;
    expected_attendance?: number | null;
    creator?: {
      id: string;
      first_name: string;
      last_name: string | null;
      email: string;
      role: string;
    } | null;
    venue?: {
      id: string;
      name: string;
      address: string;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null;
  } | null;
}

/**
 * Get all approvals for an event
 */
export async function findByEventId(
  eventId: string,
  includeApprover: boolean = true
): Promise<EventApprovalWithApprover[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_approvals")
    .select(
      includeApprover
        ? `
          *,
          approver:users!event_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
        : "*"
    )
    .eq("event_id", eventId)
    .order("sequence_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch event approvals: ${error.message}`);
  }

  // Transform data to construct approver name
  return (data || []).map((approval: EventApprovalWithApproverRaw) => ({
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
  })) as EventApprovalWithApprover[];
}

/**
 * Get pending approvals for a specific user
 *
 * @param userId - User ID to fetch approvals for
 * @param approvalType - Optional approval type filter
 * @param includeEvent - Whether to include event information
 * @param includeWaiting - If true, includes "waiting" status approvals (for Global Directors)
 */
export async function findPendingForUser(
  userId: string,
  approvalType?: string,
  includeEvent: boolean = false,
  includeWaiting: boolean = false
): Promise<EventApprovalWithApprover[]> {
  const supabase = await createClient();

  let query = supabase
    .from("event_approvals")
    .select(
      includeEvent
        ? `
          *,
          approver:users!event_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          event:events!event_approvals_event_id_fkey (
            id,
            short_id,
            title,
            status,
            starts_at,
            ends_at,
            created_at,
            description,
            budget_amount,
            budget_currency,
            expected_attendance,
            creator:users!events_creator_id_fkey (
              id,
              first_name,
              last_name,
              email,
              role
            ),
            venue:venues!events_venue_id_fkey (
              id,
              name,
              address,
              city,
              state,
              country
            )
          )
        `
        : `
          *,
          approver:users!event_approvals_approver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
    )
    .eq("approver_id", userId);

  // Global Directors see both pending and waiting approvals
  // Other users only see pending (their current turn)
  if (includeWaiting) {
    query = query.in("status", ["pending", "waiting"]);
  } else {
    query = query.eq("status", "pending");
  }

  query = query.order("created_at", { ascending: false });

  if (approvalType) {
    query = query.eq("approval_type", approvalType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  }

  // Transform data to construct approver name and event data
  return (data || []).map((approval: EventApprovalWithApproverRaw) => ({
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
    event: approval.event
      ? {
          ...approval.event,
          creator: approval.event.creator
            ? {
                id: approval.event.creator.id,
                email: approval.event.creator.email,
                role: approval.event.creator.role,
                name: approval.event.creator.last_name
                  ? `${approval.event.creator.first_name} ${approval.event.creator.last_name}`
                  : approval.event.creator.first_name,
              }
            : undefined,
          venue: approval.event.venue || null,
        }
      : undefined,
  })) as EventApprovalWithApprover[];
}

/**
 * Create a new approval record
 */
export async function insert(approval: EventApprovalInsert): Promise<EventApproval> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_approvals")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(approval)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create approval record: ${error.message}`);
  }

  return data;
}

/**
 * Update approval status
 */
export async function updateStatus(
  id: string,
  status: "waiting" | "pending" | "approved" | "rejected",
  comment?: string
): Promise<EventApproval> {
  const supabase = await createClient();

  const updateData: EventApprovalUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  const { data, error } = await supabase
    .from("event_approvals")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update approval status: ${error.message}`);
  }

  return data;
}

/**
 * Create an approval chain for an event
 * Inserts multiple approval records in sequence
 */
export async function createChain(
  eventId: string,
  approverIds: string[],
  approvalType: "event" | "modification" | "cancellation" | "report"
): Promise<EventApproval[]> {
  const supabase = await createClient();

  const approvals: EventApprovalInsert[] = approverIds.map((approverId, index) => ({
    event_id: eventId,
    approver_id: approverId,
    approval_type: approvalType,
    sequence_order: index + 1,
    status: index === 0 ? "pending" : "waiting", // First approver is pending, others are waiting
    comment: null,
  }));

  const { data, error } = await supabase
    .from("event_approvals")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(approvals)
    .select();

  if (error) {
    throw new Error(`Failed to create approval chain: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the current pending approval for an event (first in sequence with pending status)
 */
export async function findCurrentPendingApproval(eventId: string): Promise<EventApproval | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_approvals")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("sequence_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch current pending approval: ${error.message}`);
  }

  return data;
}
