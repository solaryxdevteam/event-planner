/**
 * Marketing Report Service
 *
 * Marketing manager submits reports; Global Director approves or rejects.
 * If rejected, marketing manager can add another until approved.
 */

import { createClient } from "@/lib/supabase/server";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import * as eventDAL from "@/lib/data-access/events.dal";
import * as marketingReportsDAL from "@/lib/data-access/marketing-reports.dal";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";
import { buildMarketingReportApprovalChain } from "@/lib/services/approvals/chain-builder.service";
import * as auditService from "@/lib/services/audit/audit.service";
import type { MarketingReport, MarketingReportWithSubmitter } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

const MARKETING_VISIBLE_STATUSES = ["approved_scheduled", "completed_awaiting_report", "completed_archived"];

export interface SubmitMarketingReportInput {
  notes: string | null;
  marketing_flyers?: { url: string; name?: string }[];
  marketing_videos?: { url: string; name?: string }[];
  marketing_budget?: number | null;
}

/**
 * Submit a marketing report for an event.
 * Only marketing_manager can submit. Event must be approved or past. No approved report yet; if last was rejected, can resubmit.
 * Each report carries its own flyers, videos, and budget (stored on marketing_reports table).
 */
export async function submitMarketingReport(
  userId: string,
  eventId: string,
  data: SubmitMarketingReportInput
): Promise<MarketingReport> {
  const supabase = await createClient();

  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).single();
  const role = (userRow as { role?: string } | null)?.role;

  if (role !== UserRole.MARKETING_MANAGER) {
    throw new ForbiddenError("Only Marketing Managers can submit marketing reports");
  }

  const event = await eventDAL.findByIdForMarketing(eventId);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  if (!MARKETING_VISIBLE_STATUSES.includes(event.status)) {
    throw new ForbiddenError("Marketing reports can only be submitted for approved or past events");
  }

  const allReports = await marketingReportsDAL.findAllByEventId(eventId);
  const approvedReport = allReports.find((r) => r.status === "approved");
  const pendingReport = allReports.find((r) => r.status === "pending");

  if (approvedReport) {
    throw new ForbiddenError(
      "A marketing report has already been approved for this event. No further reports are needed."
    );
  }

  if (pendingReport) {
    throw new ForbiddenError(
      "A marketing report is currently pending approval. Please wait for the Global Director to approve or reject it."
    );
  }

  const flyers = Array.isArray(data.marketing_flyers) ? data.marketing_flyers : [];
  const videos = Array.isArray(data.marketing_videos) ? data.marketing_videos : [];
  const budget =
    data.marketing_budget !== undefined && data.marketing_budget !== null && data.marketing_budget !== ""
      ? Number(data.marketing_budget)
      : null;
  if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
    throw new ValidationError("Marketing budget must be a non-negative number");
  }

  const report = await marketingReportsDAL.insert({
    event_id: eventId,
    submitted_by: userId,
    status: "pending",
    notes: data.notes?.trim() || null,
    marketing_flyers: flyers,
    marketing_videos: videos,
    marketing_budget: budget,
  });

  const gdIds = await buildMarketingReportApprovalChain();
  if (gdIds.length === 0) {
    throw new ValidationError("No Global Director found to approve marketing reports");
  }

  await approvalDAL.deleteByEventIdAndType(eventId, "marketing_report");
  await approvalDAL.createChain(eventId, gdIds, "marketing_report");

  await auditService.log("submit_report", userId, eventId, {
    event_title: event.title,
    marketing_report_id: report.id,
    approver_count: gdIds.length,
  });

  return report;
}

/**
 * Get all marketing reports for an event (with submitter name).
 */
export async function getMarketingReportsByEventId(eventId: string): Promise<MarketingReportWithSubmitter[]> {
  return marketingReportsDAL.findAllByEventId(eventId);
}
