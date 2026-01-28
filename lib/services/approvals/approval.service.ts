/**
 * Approval Service
 *
 * Business logic for event approval operations
 */

import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";
import * as eventVersionDAL from "@/lib/data-access/event-versions.dal";
import * as reportService from "@/lib/services/reports/report.service";
import * as auditService from "@/lib/services/audit/audit.service";
import { isLastApprover, getNextApprover } from "@/lib/services/approvals/chain-builder.service";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Approve an event
 * - Marks current approval as approved
 * - If last in chain OR Global Director: sets event status to approved_scheduled
 * - Else: activates next approver and notifies them
 * - Logs audit
 *
 * Special behavior for Global Directors:
 * - Can approve at any time, even if it's not their turn (status = "waiting")
 * - Their approval immediately finalizes the event (bypasses remaining approvers)
 * - All pending/waiting approvals are marked as "skipped"
 */
export async function approveEvent(
  userId: string,
  eventId: string,
  comment: string
): Promise<{ event: EventWithRelations; isLast: boolean; isGlobalDirectorBypass?: boolean }> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Get approver's user record to check their role
  const supabase = await createClient();
  const { data: approverUser, error: approverError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (approverError || !approverUser) {
    throw new NotFoundError("User", userId);
  }

  // Type assertion for Supabase query result
  type ApproverUser = { id: string; role: string };
  const approver = approverUser as ApproverUser;
  const isGlobalDirector = approver.role === "global_director";

  // Get current pending/waiting approval for this user
  // Need to filter by approval_type to handle different types (event, modification, etc.)
  const approvals = await approvalDAL.findByEventId(eventId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this event");
  }

  const approvalType = currentApproval.approval_type || "event";

  // Check if this is the current approver's turn
  // Global Directors can approve at any time, bypassing the queue
  if (currentApproval.status === "waiting" && !isGlobalDirector) {
    throw new ForbiddenError("It is not your turn to approve this event");
  }

  // Update approval status
  await approvalDAL.updateStatus(currentApproval.id, "approved", comment);

  // Check if this is the last approver (filter by approval_type)
  const isLast = await isLastApprover(eventId, currentApproval.sequence_order, approvalType);

  // IMPORTANT: Global Director approval ALWAYS means final approval, regardless of position in chain
  // This allows Global Directors to approve events even if intermediate approvers haven't approved yet
  // Global Director approval OR last approver = final approval
  if (isLast || isGlobalDirector) {
    // If Global Director is bypassing intermediate approvers, mark all remaining approvals as approved (skipped)
    if (isGlobalDirector && !isLast) {
      const pendingApprovals = approvals.filter(
        (a) =>
          a.id !== currentApproval.id &&
          a.approval_type === approvalType &&
          (a.status === "pending" || a.status === "waiting")
      );

      for (const approval of pendingApprovals) {
        await approvalDAL.updateStatus(
          approval.id,
          "approved", // Mark as approved since Global Director approved (bypassing intermediate steps)
          "Skipped: Global Director approved"
        );
      }
    }

    // Handle final approval based on approval type
    if (approvalType === "modification") {
      // For modifications: apply the version data to the event
      const pendingVersion = await eventVersionDAL.findPendingVersion(eventId);
      if (!pendingVersion) {
        throw new NotFoundError("Pending modification version", eventId);
      }

      type EventVersionData = {
        title: string;
        description: string | null;
        starts_at: string;
        ends_at: string | null;
        venue_id: string | null;
        expected_attendance: number | null;
        budget_amount: number | null;
        budget_currency: string | null;
        notes: string | null;
      };

      const versionData = pendingVersion.version_data as EventVersionData;

      // Update event with modification data
      await eventDAL.update(eventId, {
        title: versionData.title,
        description: versionData.description || null,
        starts_at: versionData.starts_at,
        ends_at: versionData.ends_at || null,
        venue_id: versionData.venue_id || null,
        expected_attendance: versionData.expected_attendance || null,
        budget_amount: versionData.budget_amount || null,
        budget_currency: versionData.budget_currency || "USD",
        notes: versionData.notes || null,
      });

      // Log audit trail
      await auditService.log("approve_modification", userId, eventId, {
        event_title: event.title,
        version_id: pendingVersion.id,
        comment,
        final_approval: true,
        global_director_bypass: isGlobalDirector && !isLast,
      });
    } else if (approvalType === "cancellation") {
      // For cancellations: set event status to cancelled
      await eventDAL.update(eventId, {
        status: "cancelled",
      });

      // Log audit trail
      await auditService.log("approve_cancellation", userId, eventId, {
        event_title: event.title,
        comment,
        final_approval: true,
        global_director_bypass: isGlobalDirector && !isLast,
      });
    } else if (approvalType === "report") {
      // For reports: set event status to completed_archived
      await eventDAL.update(eventId, {
        status: "completed_archived",
      });

      // Update report status to approved
      const report = await reportService.getReportByEventId(eventId);
      if (report) {
        await reportService.approveReport(report.id);
      }

      // Log audit trail
      await auditService.log("approve_report", userId, eventId, {
        event_title: event.title,
        comment,
        final_approval: true,
        global_director_bypass: isGlobalDirector && !isLast,
      });
    } else {
      // For regular events: set event status to approved_scheduled
      await eventDAL.update(eventId, {
        status: "approved_scheduled",
      });

      // Log audit trail
      await auditService.log("approve", userId, eventId, {
        event_title: event.title,
        comment,
        final_approval: true,
        global_director_bypass: isGlobalDirector && !isLast,
      });
    }
  } else {
    // Not last - activate next approver
    const nextApproverId = await getNextApprover(eventId, currentApproval.sequence_order, approvalType);
    if (nextApproverId) {
      // Find next approval with same approval_type
      const nextApproval = approvals.find((a) => a.approver_id === nextApproverId && a.approval_type === approvalType);
      if (nextApproval) {
        await approvalDAL.updateStatus(nextApproval.id, "pending", undefined);
      }

      // Notify next approver (stub for now - will be implemented in Phase 14)
      // await emailService.sendApprovalNotification(nextApproverId, eventId, approvalType);
    }

    // Log audit trail
    const logAction = approvalType === "modification" ? "approve_modification" : "approve";
    await auditService.log(logAction, userId, eventId, {
      event_title: event.title,
      comment,
      final_approval: false,
    });
  }

  // Fetch updated event
  const updatedEvent = await eventDAL.findById(eventId, subordinateIds, true);
  if (!updatedEvent) {
    throw new NotFoundError("Event", eventId);
  }

  return {
    event: updatedEvent,
    isLast: isLast || isGlobalDirector,
    isGlobalDirectorBypass: isGlobalDirector && !isLast,
  };
}

/**
 * Reject an event
 * - Marks current approval as rejected
 * - Sets event status to rejected
 * - Notifies creator
 * - Logs audit
 */
export async function rejectEvent(userId: string, eventId: string, comment: string): Promise<EventWithRelations> {
  if (!comment || comment.trim().length === 0) {
    throw new ValidationError("Comment is required when rejecting an event");
  }

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Get approver's user record to check their role
  const supabase = await createClient();
  const { data: approverUser, error: approverError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (approverError || !approverUser) {
    throw new NotFoundError("User", userId);
  }

  // Type assertion for Supabase query result
  type ApproverUser = { id: string; role: string };
  const approver = approverUser as ApproverUser;
  const isGlobalDirector = approver.role === "global_director";

  // Get current pending approval for this user
  const approvals = await approvalDAL.findByEventId(eventId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this event");
  }

  const approvalType = currentApproval.approval_type || "event";

  // Check if this is the current approver's turn
  // Global Directors can reject at any time, bypassing the queue
  if (currentApproval.status === "waiting" && !isGlobalDirector) {
    throw new ForbiddenError("It is not your turn to approve this event");
  }

  // Update approval status
  await approvalDAL.updateStatus(currentApproval.id, "rejected", comment);

  // Handle rejection based on approval type
  if (approvalType === "modification") {
    // For modifications: mark version as rejected, original event stays unchanged
    const pendingVersion = await eventVersionDAL.findPendingVersion(eventId);
    if (pendingVersion) {
      // Update version status to rejected
      await eventVersionDAL.update(pendingVersion.id, {
        status: "rejected",
      });
    }

    // Log audit trail
    await auditService.log("reject_modification", userId, eventId, {
      event_title: event.title,
      comment,
    });
  } else if (approvalType === "cancellation") {
    // For cancellations: event stays approved_scheduled, cancellation is rejected
    // Log audit trail
    await auditService.log("reject_cancellation", userId, eventId, {
      event_title: event.title,
      comment,
    });
  } else if (approvalType === "report") {
    // For reports: event stays completed_awaiting_report, report is rejected
    const report = await reportService.getReportByEventId(eventId);
    if (report) {
      await reportService.rejectReport(report.id);
    }

    // Log audit trail
    await auditService.log("reject_report", userId, eventId, {
      event_title: event.title,
      comment,
    });
  } else {
    // For regular events: set event status to rejected
    await eventDAL.update(eventId, {
      status: "rejected",
    });

    // Notify creator (stub for now - will be implemented in Phase 14)
    // await emailService.sendApprovalResultNotification(event.creator_id, eventId, false, comment);

    // Log audit trail
    await auditService.log("reject", userId, eventId, {
      event_title: event.title,
      comment,
    });
  }

  // Fetch updated event
  const updatedEvent = await eventDAL.findById(eventId, subordinateIds, true);
  if (!updatedEvent) {
    throw new NotFoundError("Event", eventId);
  }

  return updatedEvent;
}

/**
 * Get pending approvals for a user
 *
 * For Global Directors: Returns all approvals (pending + waiting) so they can approve
 * at any stage, even if intermediate approvers haven't approved yet.
 *
 * For other roles: Returns only pending approvals (their current turn).
 */
export async function getPendingApprovals(
  userId: string,
  approvalType: "event" | "modification" | "cancellation" | "report" = "event"
): Promise<EventApprovalWithApprover[]> {
  // Check if user is Global Director
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.from("users").select("role").eq("id", userId).single();

  if (userError || !user) {
    throw new NotFoundError("User", userId);
  }

  // Type assertion for Supabase query result
  type UserRole = { role: string };
  const userRole = (user as UserRole).role;
  const isGlobalDirector = userRole === "global_director";

  // Global Directors see both pending and waiting approvals
  // Other users only see pending (their current turn)
  return approvalDAL.findPendingForUser(userId, approvalType, true, isGlobalDirector);
}

/**
 * Notify next approver (stub for now)
 * Will be implemented in Phase 14 with email service
 */
export async function notifyNextApprover(eventId: string): Promise<void> {
  // Stub - will be implemented in Phase 14
  console.log(`[STUB] Notifying next approver for event ${eventId}`);
}
