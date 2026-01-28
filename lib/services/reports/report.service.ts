/**
 * Report Service
 *
 * Handles post-event report submission and approval
 * - Only event creator can submit reports
 * - Only for events with status completed_awaiting_report
 * - Goes through approval chain up to Global Director
 */

import { createClient } from "@/lib/supabase/server";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import { buildApprovalChain } from "@/lib/services/approvals/chain-builder.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import * as reportDAL from "@/lib/data-access/reports.dal";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import * as storageService from "@/lib/services/storage/storage.service";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import type { Report } from "@/lib/types/database.types";

export interface SubmitReportInput {
  attendance_count: number;
  summary: string;
  feedback?: string | null;
  external_links?: Array<{ url: string; title: string }> | null;
  mediaFiles?: File[];
}

/**
 * Submit a report for an event
 */
export async function submitReport(
  userId: string,
  eventId: string,
  reportData: SubmitReportInput,
  mediaFiles?: File[]
): Promise<Report> {
  const subordinateIds = await getSubordinateUserIds(userId);
  const event = await eventDAL.findById(eventId, subordinateIds, false);

  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Check ownership: only the creator can submit reports
  if (event.creator_id !== userId) {
    throw new ForbiddenError("You can only submit reports for your own events");
  }

  // Check that event is completed_awaiting_report
  if (event.status !== "completed_awaiting_report") {
    throw new ForbiddenError("Reports can only be submitted for events that are awaiting report");
  }

  // Check if report already exists
  const existingReport = await reportDAL.findByEventId(eventId);
  if (existingReport && existingReport.status !== "rejected") {
    throw new ForbiddenError("A report already exists for this event");
  }

  // Validate required fields
  if (!reportData.attendance_count || reportData.attendance_count < 0) {
    throw new ValidationError("Attendance count is required and must be >= 0");
  }

  if (!reportData.summary || reportData.summary.trim().length === 0) {
    throw new ValidationError("Summary is required");
  }

  if (reportData.summary.length < 20 || reportData.summary.length > 1000) {
    throw new ValidationError("Summary must be between 20 and 1000 characters");
  }

  // Upload media files if provided
  let mediaUrls: string[] = [];
  if (mediaFiles && mediaFiles.length > 0) {
    mediaUrls = await Promise.all(mediaFiles.map((file) => storageService.uploadReportMedia(eventId, file)));
  }

  // If existing report is rejected, delete it first
  if (existingReport && existingReport.status === "rejected") {
    await reportDAL.deleteReport(existingReport.id);
  }

  // Create report
  const report = await reportDAL.insert({
    event_id: eventId,
    attendance_count: reportData.attendance_count,
    summary: reportData.summary,
    feedback: reportData.feedback || null,
    media_urls: mediaUrls,
    external_links: reportData.external_links || [],
    status: "pending",
  });

  // Build approval chain for report (same as original event)
  const approverIds = await buildApprovalChain(event.creator_id);

  if (approverIds.length === 0) {
    throw new ValidationError("No approvers found in the approval chain. Please contact your system administrator.");
  }

  // Create approval chain for report
  await approvalDAL.createChain(eventId, approverIds, "report");

  // Log audit trail
  await auditService.log("submit_report", userId, eventId, {
    event_title: event.title,
    report_id: report.id,
    attendance_count: reportData.attendance_count,
    approver_count: approverIds.length,
  });

  return report;
}

/**
 * Update a rejected report (resubmission)
 */
export async function updateReport(
  userId: string,
  reportId: string,
  reportData: SubmitReportInput,
  mediaFiles?: File[]
): Promise<Report> {
  const supabase = await createClient();
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get existing report
  const { data: report, error: reportError } = await supabase.from("reports").select("*").eq("id", reportId).single();

  if (reportError || !report) {
    throw new NotFoundError("Report", reportId);
  }

  const reportRow = report as import("@/lib/types/database.types").Database["public"]["Tables"]["reports"]["Row"];

  // Get event
  const event = await eventDAL.findById(reportRow.event_id, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", reportRow.event_id);
  }

  // Check ownership
  if (event.creator_id !== userId) {
    throw new ForbiddenError("You can only update reports for your own events");
  }

  // Check that report is rejected
  if (reportRow.status !== "rejected") {
    throw new ForbiddenError("Only rejected reports can be updated");
  }

  // Upload new media files if provided
  let mediaUrls: string[] = (reportRow.media_urls as string[] | null) || [];
  if (mediaFiles && mediaFiles.length > 0) {
    const newMediaUrls = await Promise.all(
      mediaFiles.map((file) => storageService.uploadReportMedia(reportRow.event_id, file))
    );
    mediaUrls = [...mediaUrls, ...newMediaUrls];
  }

  // Update report
  const updatedReport = await reportDAL.update(reportId, {
    attendance_count: reportData.attendance_count,
    summary: reportData.summary,
    feedback: reportData.feedback || null,
    media_urls: mediaUrls,
    external_links: reportData.external_links || [],
    status: "pending",
  });

  // Recreate approval chain
  const approverIds = await buildApprovalChain(event.creator_id);
  await approvalDAL.createChain(reportRow.event_id, approverIds, "report");

  // Log audit trail (reuse submit_report action type for resubmissions)
  await auditService.log("submit_report", userId, reportRow.event_id, {
    event_title: event.title,
    report_id: reportId,
  });

  return updatedReport;
}

/**
 * Get report by event ID
 */
export async function getReportByEventId(eventId: string): Promise<Report | null> {
  return reportDAL.findByEventId(eventId);
}

/**
 * Get pending reports awaiting user's approval
 */
export interface PendingReport {
  report: Report;
  event: Awaited<ReturnType<typeof eventDAL.findById>> | null;
  approval: {
    event_id: string | null;
    status: string;
    approver_id: string | null;
  } | null;
}

export async function getPendingReports(userId: string): Promise<PendingReport[]> {
  const supabase = await createClient();
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get approvals where user is approver and status is pending
  const { data: approvals, error } = await supabase
    .from("event_approvals")
    .select("*")
    .eq("approver_id", userId)
    .eq("approval_type", "report")
    .in("status", ["pending", "waiting"]);

  if (error) {
    throw new Error(`Failed to fetch pending reports: ${error.message}`);
  }

  if (!approvals || approvals.length === 0) {
    return [];
  }

  // Fetch reports and events for these approvals
  const eventIds = [
    ...new Set(approvals.map((a: { event_id: string | null }) => (a.event_id ? String(a.event_id) : ""))),
  ].filter((id) => id !== "");
  const reports = await Promise.all(eventIds.map((eventId) => reportDAL.findByEventId(eventId)));
  const events = await Promise.all(eventIds.map((id) => eventDAL.findById(id, subordinateIds, true)));

  // Combine reports with events
  return reports
    .map<PendingReport | null>((report, index) => {
      if (!report) return null;
      const approval =
        (approvals as Array<{ event_id: string | null; status: string; approver_id: string | null }>).find(
          (a) => a.event_id === report.event_id
        ) ?? null;
      return {
        report,
        event: events[index],
        approval: approval
          ? {
              event_id: approval.event_id,
              status: approval.status,
              approver_id: approval.approver_id,
            }
          : null,
      };
    })
    .filter((item): item is PendingReport => item !== null);
}

/**
 * Approve a report (called from approval service when last approver)
 */
export async function approveReport(reportId: string): Promise<Report> {
  return reportDAL.update(reportId, {
    status: "approved",
  });
}

/**
 * Reject a report (called from approval service)
 */
export async function rejectReport(reportId: string): Promise<Report> {
  return reportDAL.update(reportId, {
    status: "rejected",
  });
}
