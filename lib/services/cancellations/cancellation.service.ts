/**
 * Cancellation Service
 *
 * Handles event cancellation requests and approvals
 * - Only allowed for approved_scheduled events
 * - Configurable permissions (default: Event Planner + approval chain members)
 * - Goes through approval chain up to Global Director
 */

import { createClient } from "@/lib/supabase/server";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import { buildApprovalChain } from "@/lib/services/approvals/chain-builder.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

/**
 * Check if user can request cancellation for an event
 * - Event creator can always request
 * - Others need to be in approval chain (configurable)
 */
export async function canRequestCancellation(userId: string, eventId: string): Promise<boolean> {
  const subordinateIds = await getSubordinateUserIds(userId);
  const event = await eventDAL.findById(eventId, subordinateIds, false);

  if (!event) {
    return false;
  }

  // Only approved_scheduled events can be cancelled
  if (event.status !== "approved_scheduled") {
    return false;
  }

  // Check if there's already a pending cancellation
  const approvals = await approvalDAL.findByEventId(eventId, false);
  const pendingCancellation = approvals.find(
    (a) => a.approval_type === "cancellation" && (a.status === "pending" || a.status === "waiting")
  );

  if (pendingCancellation) {
    return false;
  }

  // Event creator can always request cancellation
  if (event.creator_id === userId) {
    return true;
  }

  // Check if user is in the original approval chain
  const eventApprovals = approvals.filter((a) => a.approval_type === "event");
  const isInApprovalChain = eventApprovals.some((a) => a.approver_id === userId);

  return isInApprovalChain;
}

/**
 * Request cancellation for an event
 * - Validates permissions
 * - Creates cancellation approval chain
 * - Logs audit
 */
export async function requestCancellation(
  userId: string,
  eventId: string,
  reason: string
): Promise<EventWithRelations> {
  if (!reason || reason.trim().length === 0) {
    throw new ValidationError("Cancellation reason is required");
  }

  // Check if user can request cancellation
  const canRequest = await canRequestCancellation(userId, eventId);
  if (!canRequest) {
    throw new ForbiddenError("You do not have permission to request cancellation for this event");
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  const event = await eventDAL.findById(eventId, subordinateIds, false);

  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Build approval chain for cancellation (same approvers as original event)
  const approverIds = await buildApprovalChain(event.creator_id);

  if (approverIds.length === 0) {
    throw new ValidationError("No approvers found in the approval chain. Please contact your system administrator.");
  }

  // Create approval chain for cancellation
  await approvalDAL.createChain(eventId, approverIds, "cancellation");

  // Log audit trail
  await auditService.log("request_cancellation", userId, eventId, {
    event_title: event.title,
    reason,
    approver_count: approverIds.length,
  });

  // Fetch updated event with relations
  const eventWithRelations = await eventDAL.findById(eventId, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", eventId);
  }

  return eventWithRelations;
}

/**
 * Check if event has a pending cancellation request
 */
export async function hasPendingCancellation(eventId: string): Promise<boolean> {
  const approvals = await approvalDAL.findByEventId(eventId, false);
  return approvals.some(
    (a) => a.approval_type === "cancellation" && (a.status === "pending" || a.status === "waiting")
  );
}

/**
 * Get pending cancellations awaiting user's approval
 */
export async function getPendingCancellations(userId: string): Promise<EventWithRelations[]> {
  const supabase = await createClient();
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get approvals where user is approver and status is pending
  const { data: approvals, error } = await supabase
    .from("event_approvals")
    .select("*")
    .eq("approver_id", userId)
    .eq("approval_type", "cancellation")
    .in("status", ["pending", "waiting"]);

  if (error) {
    throw new Error(`Failed to fetch pending cancellations: ${error.message}`);
  }

  if (!approvals || approvals.length === 0) {
    return [];
  }

  // Fetch events for these approvals
  const eventIds = [
    ...new Set(approvals.map((a: { event_id: string | null }) => (a.event_id ? String(a.event_id) : ""))),
  ].filter((id) => id !== "");
  const events = await Promise.all(eventIds.map((eventId) => eventDAL.findById(eventId, subordinateIds, true)));

  return events.filter((e) => e !== null) as EventWithRelations[];
}
