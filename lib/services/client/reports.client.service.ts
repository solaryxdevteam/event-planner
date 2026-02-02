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
  sortByNetProfit?: "asc" | "desc" | null;
  chart?: boolean;
}

export interface ListApprovedReportsResponse {
  reports: ApprovedReportRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  chartData?: ReportChartDataPoint[];
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
  if (params.sortByNetProfit) searchParams.set("sortByNetProfit", params.sortByNetProfit);
  if (params.chart) searchParams.set("chart", "true");
  const query = searchParams.toString();
  const url = query ? `/api/reports?${query}` : "/api/reports";
  const res = await apiClient.get<{
    reports: ApprovedReportRow[];
    pagination: ListApprovedReportsResponse["pagination"];
    chartData?: ReportChartDataPoint[];
  }>(url);
  return {
    reports: res.reports ?? [],
    pagination: res.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false },
    ...(res.chartData !== undefined && { chartData: res.chartData }),
  };
}

export interface SubmitReportData {
  attendance_count: number;
  summary: string;
  feedback?: string | null;
  external_links?: Array<{ url: string; title: string }> | null;
  net_profit?: number | null;
  mediaFiles?: File[];
}

/**
 * Submit a report for an event
 */
export async function submitReport(eventId: string, data: SubmitReportData): Promise<Report> {
  const formData = new FormData();
  formData.append("attendance_count", data.attendance_count.toString());
  formData.append("summary", data.summary);
  if (data.feedback) {
    formData.append("feedback", data.feedback);
  }
  if (data.external_links) {
    formData.append("external_links", JSON.stringify(data.external_links));
  }
  if (data.net_profit != null && Number.isFinite(data.net_profit)) {
    formData.append("net_profit", String(data.net_profit));
  }

  // Append media files
  if (data.mediaFiles) {
    data.mediaFiles.forEach((file, index) => {
      formData.append(`media_${index}`, file);
    });
  }

  // Use fetch directly for FormData
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
 * Get report for an event
 */
export async function getReportByEventId(eventId: string): Promise<Report | null> {
  return apiClient.get<Report | null>(`/api/events/${eventId}/report`);
}

/**
 * Update a rejected report (resubmission)
 */
export async function updateReport(reportId: string, eventId: string, data: SubmitReportData): Promise<Report> {
  const formData = new FormData();
  formData.append("reportId", reportId);
  formData.append("attendance_count", data.attendance_count.toString());
  formData.append("summary", data.summary);
  if (data.feedback) {
    formData.append("feedback", data.feedback);
  }
  if (data.external_links) {
    formData.append("external_links", JSON.stringify(data.external_links));
  }
  if (data.net_profit != null && Number.isFinite(data.net_profit)) {
    formData.append("net_profit", String(data.net_profit));
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
