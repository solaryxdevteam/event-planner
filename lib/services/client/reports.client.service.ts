/**
 * Reports Client Service
 *
 * Client-side service for report operations
 * Makes API calls to /api/events endpoints via API client
 */

import { apiClient } from "./api-client";
import type { Report } from "@/lib/types/database.types";

export interface SubmitReportData {
  attendance_count: number;
  summary: string;
  feedback?: string | null;
  external_links?: Array<{ url: string; title: string }> | null;
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
