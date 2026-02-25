/**
 * Reports Client Service
 *
 * Client-side service for report operations
 * Makes API calls to /api/events and /api/reports endpoints via API client
 */

import { apiClient } from "./api-client";
import type { Report } from "@/lib/types/database.types";
import type { ApprovedReportRow } from "@/lib/data-access/reports.dal";
import type { ReportChartDataPoint } from "@/lib/data-access/reports.dal";

export interface ListApprovedReportsParams {
  page?: number;
  limit?: number;
  eventId?: string | null;
  venueId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  userId?: string | null;
  djId?: string | null;
  chart?: boolean;
}

export interface ListApprovedReportsResponse {
  reports: ApprovedReportRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  chartData?: ReportChartDataPoint[];
  /** Same date range last year, for YoY growth comparison */
  chartDataPriorYear?: ReportChartDataPoint[];
}

/**
 * List approved reports with filters, sort, pagination; optionally include chart data
 */
export async function listApprovedReports(params: ListApprovedReportsParams): Promise<ListApprovedReportsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.eventId) searchParams.set("eventId", params.eventId);
  if (params.venueId) searchParams.set("venueId", params.venueId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.userId) searchParams.set("userId", params.userId);
  if (params.djId) searchParams.set("djId", params.djId);
  if (params.chart) searchParams.set("chart", "true");
  const query = searchParams.toString();
  const url = query ? `/api/reports?${query}` : "/api/reports";
  const res = await apiClient.get<{
    reports: ApprovedReportRow[];
    pagination: ListApprovedReportsResponse["pagination"];
    chartData?: ReportChartDataPoint[];
    chartDataPriorYear?: ReportChartDataPoint[];
  }>(url);
  return {
    reports: res.reports ?? [],
    pagination: res.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
    ...(res.chartData !== undefined && { chartData: res.chartData }),
    ...(res.chartDataPriorYear !== undefined && { chartDataPriorYear: res.chartDataPriorYear }),
  };
}

export interface SubmitReportData {
  attendance_count: number;
  total_ticket_sales?: number | null;
  total_bar_sales?: number | null;
  total_table_sales?: number | null;
  detailed_report: string;
  incidents?: string | null;
  feedback?: string | null;
  external_links?: Array<{ url: string; title: string }> | null;
  /** When using upload-on-select (like DJForm/VenueForm) */
  reelsUrls?: string[];
  mediaUrls?: string[];
  /** POS report attachment URLs (images, videos, PDFs, etc.). Required. */
  pos_report_attachment_urls?: string[];
  reelsFiles?: File[];
  mediaFiles?: File[];
}

/**
 * Upload a single report media file (reel, photo, or pos_report). Use when user selects files so thumbnails use real URLs.
 */
export async function uploadReportMedia(
  eventId: string,
  file: File,
  type: "reel" | "photo" | "pos_report"
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type as "reel" | "photo" | "pos_report");
  const res = await fetch(`/api/events/${eventId}/report/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const data = await res.json();
  return { url: data.url };
}

/**
 * Submit a report for an event. Uses JSON when reelsUrls/mediaUrls are provided (upload-on-select flow).
 */
export async function submitReport(eventId: string, data: SubmitReportData): Promise<Report> {
  const useJson = Array.isArray(data.reelsUrls) && Array.isArray(data.mediaUrls);

  if (useJson) {
    const response = await fetch(`/api/events/${eventId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendance_count: data.attendance_count,
        total_ticket_sales: data.total_ticket_sales ?? null,
        total_bar_sales: data.total_bar_sales ?? null,
        total_table_sales: data.total_table_sales ?? null,
        detailed_report: data.detailed_report,
        incidents: data.incidents ?? null,
        feedback: data.feedback ?? null,
        external_links: data.external_links ?? null,
        reels_urls: data.reelsUrls,
        media_urls: data.mediaUrls,
        pos_report_attachment_urls: data.pos_report_attachment_urls ?? [],
      }),
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to submit report");
    }
    const result = await response.json();
    return result.data;
  }

  const formData = new FormData();
  formData.append("attendance_count", data.attendance_count.toString());
  formData.append("detailed_report", data.detailed_report);
  if (data.total_ticket_sales != null && Number.isFinite(data.total_ticket_sales)) {
    formData.append("total_ticket_sales", String(data.total_ticket_sales));
  }
  if (data.total_bar_sales != null && Number.isFinite(data.total_bar_sales)) {
    formData.append("total_bar_sales", String(data.total_bar_sales));
  }
  if (data.total_table_sales != null && Number.isFinite(data.total_table_sales)) {
    formData.append("total_table_sales", String(data.total_table_sales));
  }
  if (data.incidents) {
    formData.append("incidents", data.incidents);
  }
  if (data.feedback) {
    formData.append("feedback", data.feedback);
  }
  if (data.external_links) {
    formData.append("external_links", JSON.stringify(data.external_links));
  }
  if (data.reelsFiles) {
    data.reelsFiles.forEach((file, index) => {
      formData.append(`reels_${index}`, file);
    });
  }
  if (data.mediaFiles) {
    data.mediaFiles.forEach((file, index) => {
      formData.append(`media_${index}`, file);
    });
  }

  const response = await fetch(`/api/events/${eventId}/report`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to submit report");
  }
  const result = await response.json();
  return result.data;
}

/**
 * Get report for an event (returns approved report if exists, otherwise most recent)
 */
export async function getReportByEventId(eventId: string): Promise<Report | null> {
  return apiClient.get<Report | null>(`/api/events/${eventId}/report`);
}

/**
 * Get all reports for an event
 */
export async function getAllReportsByEventId(eventId: string): Promise<Report[]> {
  return apiClient.get<Report[]>(`/api/events/${eventId}/report?all=true`);
}

/**
 * Update a rejected report (resubmission)
 */
export async function updateReport(reportId: string, eventId: string, data: SubmitReportData): Promise<Report> {
  const formData = new FormData();
  formData.append("reportId", reportId);
  formData.append("attendance_count", data.attendance_count.toString());
  if (data.feedback) {
    formData.append("feedback", data.feedback);
  }
  if (data.external_links) {
    formData.append("external_links", JSON.stringify(data.external_links));
  }

  // Append media files
  if (data.mediaFiles) {
    data.mediaFiles.forEach((file, index) => {
      formData.append(`media_${index}`, file);
    });
  }

  // Use fetch directly for FormData
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "PUT",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update report");
  }

  const result = await response.json();
  return result.data;
}
