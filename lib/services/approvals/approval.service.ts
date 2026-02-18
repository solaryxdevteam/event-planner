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
import * as marketingReportsDAL from "@/lib/data-access/marketing-reports.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import { isLastApprover, getNextApprover } from "@/lib/services/approvals/chain-builder.service";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { createClient } from "@/lib/supabase/server";
import * as emailService from "../email/email.service";
import { buildIcsContent } from "../calendar/ics.service";

/**
 * Approve an event
 * - Marks current approval as approved
 * - If last in chain: sets event status (e.g. approved_scheduled)
 * - Else: activates next approver and notifies them
 * - Logs audit
 *
 * Pyramid is enforced for all roles including Global Director: you can only approve when it is your turn (status = "pending").
 * Global Directors can see all pending/waiting approvals but cannot bypass the chain.
 */
export async function approveEvent(
  userId: string,
  eventId: string,
  comment: string
): Promise<{ event: EventWithRelations; isLast: boolean }> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);
  const supabase = await createClient();

  // Get the event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Get current pending approval for this user (must be their turn = status "pending")
  const approvals = await approvalDAL.findByEventId(eventId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this event");
  }

  const approvalType = currentApproval.approval_type || "event";

  // Enforce pyramid: only the current approver (status = "pending") can approve. No bypass for any role.
  if (currentApproval.status === "waiting") {
    throw new ForbiddenError("It is not your turn to approve this event");
  }

  // Update approval status
  await approvalDAL.updateStatus(currentApproval.id, "approved", comment);

  // Check if this is the last approver (filter by approval_type)
  const isLast = await isLastApprover(eventId, currentApproval.sequence_order, approvalType);

  if (isLast) {
    // Handle final approval based on approval type
    if (approvalType === "modification") {
      // For modifications: apply the version data to the event
      const pendingVersion = await eventVersionDAL.findPendingVersion(eventId);
      if (!pendingVersion) {
        throw new NotFoundError("Pending modification version", eventId);
      }

      type EventVersionData = {
        title: string;
        starts_at: string;
        venue_id: string | null;
        dj_id?: string | null;
        expected_attendance: number | null;
        minimum_ticket_price: number | null;
        minimum_table_price: number | null;
        notes: string | null;
      };

      const versionData = pendingVersion.version_data as EventVersionData;

      // Update event with modification data
      await eventDAL.update(eventId, {
        title: versionData.title,
        starts_at: versionData.starts_at,
        venue_id: versionData.venue_id || null,
        dj_id: versionData.dj_id ?? null,
        expected_attendance: versionData.expected_attendance || null,
        minimum_ticket_price: versionData.minimum_ticket_price ?? null,
        minimum_table_price: versionData.minimum_table_price ?? null,
        notes: versionData.notes || null,
      });

      // Log audit trail
      await auditService.log("approve_modification", userId, eventId, {
        event_title: event.title,
        version_id: pendingVersion.id,
        comment,
        final_approval: true,
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
      });
    } else if (approvalType === "marketing_report") {
      // For marketing reports: update the pending marketing report to approved
      const pendingMarketingReport = await marketingReportsDAL.findPendingByEventId(eventId);
      if (pendingMarketingReport) {
        await marketingReportsDAL.updateStatus(pendingMarketingReport.id, "approved");
      }

      await auditService.log("approve_report", userId, eventId, {
        event_title: event.title,
        comment,
        final_approval: true,
        marketing_report: true,
      });
    } else {
      // For regular events: set event status to approved_scheduled
      await eventDAL.update(eventId, {
        status: "approved_scheduled",
      });

      // Notify event creator (respect notification preferences)
      try {
        const { data: creator } = await supabase
          .from("users")
          .select("email, notification_prefs")
          .eq("id", event.creator_id)
          .single<{
            email: string;
            notification_prefs: { email_enabled?: boolean; event_approved?: boolean } | null;
          }>();
        const prefs = creator?.notification_prefs;
        if (creator?.email && prefs?.email_enabled !== false && prefs?.event_approved !== false) {
          await emailService.sendEventApprovedEmail(creator.email, event.title, event.short_id);
        }
      } catch (err) {
        console.error("Failed to send event approved email:", err);
      }

      // Send calendar invite (email + .ics) to event planner, DJs, subordinates, and marketing manager
      try {
        const eventWithRelations = await eventDAL.findById(eventId, subordinateIds, true);
        if (
          eventWithRelations?.starts_at &&
          (eventWithRelations.creator?.email ||
            eventWithRelations.dj?.email ||
            (await getSubordinateUserIds(event.creator_id)).length > 0)
        ) {
          const icsContent = buildIcsContent({
            title: eventWithRelations.title,
            startsAt: eventWithRelations.starts_at,
            venueName: eventWithRelations.venue?.name ?? null,
            venueAddress: eventWithRelations.venue?.address ?? null,
            description: eventWithRelations.notes ?? null,
            uid: eventWithRelations.id,
          });
          const creatorSubordinateIds = await getSubordinateUserIds(event.creator_id);
          const { data: subordinateUsers } = await supabase
            .from("users")
            .select("email")
            .in("id", creatorSubordinateIds)
            .eq("is_active", true);
          const { data: marketingManagers } = await supabase
            .from("users")
            .select("email")
            .eq("role", "marketing_manager")
            .eq("is_active", true);
          const emails = new Set<string>();
          if (eventWithRelations.creator?.email) emails.add(eventWithRelations.creator.email);
          if (eventWithRelations.dj?.email) emails.add(eventWithRelations.dj.email);
          (subordinateUsers ?? []).forEach((u) => u.email && emails.add(u.email));
          (marketingManagers ?? []).forEach((u) => u.email && emails.add(u.email));
          for (const toEmail of emails) {
            if (!toEmail?.trim()) continue;
            try {
              await emailService.sendEventCalendarInviteEmail(
                toEmail,
                eventWithRelations.title,
                eventWithRelations.short_id,
                icsContent
              );
            } catch (err) {
              console.error(`Failed to send calendar invite to ${toEmail}:`, err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to send event calendar invites:", err);
      }

      // Log audit trail
      await auditService.log("approve", userId, eventId, {
        event_title: event.title,
        comment,
        final_approval: true,
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

      // Notify for last approver (global director)
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
    isLast,
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

  // Get current pending approval for this user
  const approvals = await approvalDAL.findByEventId(eventId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this event");
  }

  const approvalType = currentApproval.approval_type || "event";

  // Enforce pyramid: only the current approver (status = "pending") can reject. No bypass for any role.
  if (currentApproval.status === "waiting") {
    throw new ForbiddenError("It is not your turn to approve this event");
  }

  const supabase = await createClient();

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
  } else if (approvalType === "marketing_report") {
    const pendingMarketingReport = await marketingReportsDAL.findPendingByEventId(eventId);
    if (pendingMarketingReport) {
      await marketingReportsDAL.updateStatus(pendingMarketingReport.id, "rejected");
    }

    await auditService.log("reject_report", userId, eventId, {
      event_title: event.title,
      comment,
      marketing_report: true,
    });
  } else {
    // For regular events: set event status to rejected
    await eventDAL.update(eventId, {
      status: "rejected",
    });

    // Notify event creator (respect notification preferences)
    try {
      const { data: creator } = await supabase
        .from("users")
        .select("email, notification_prefs")
        .eq("id", event.creator_id)
        .single<{
          email: string;
          notification_prefs: { email_enabled?: boolean; event_rejected?: boolean } | null;
        }>();
      const prefs = creator?.notification_prefs;
      if (creator?.email && prefs?.email_enabled !== false && prefs?.event_rejected !== false) {
        await emailService.sendEventRejectedEmail(creator.email, event.title, eventId, comment);
      }
    } catch (err) {
      console.error("Failed to send event rejected email:", err);
    }

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
 * For Global Directors: Returns all approvals (pending + waiting) for visibility.
 * They can only approve/reject when it is their turn (status = "pending"); pyramid is not bypassed.
 *
 * For other roles: Returns only pending approvals (their current turn).
 */
export async function getPendingApprovals(
  userId: string,
  approvalType: "event" | "modification" | "cancellation" | "report" | "marketing_report" = "event"
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
