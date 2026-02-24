/**
 * Events Client Service
 *
 * Client-side service for event operations
 * Makes API calls to /api/events endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validation/events.schema";
import type { EventVersion } from "@/lib/types/database.types";

/**
 * Event filters for GET request
 */
export interface EventFilters {
  status?: string | string[];
  creatorId?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  startsAtFrom?: string;
  startsAtTo?: string;
  search?: string;
  state?: string; // Filter by venue state
  page?: number;
  pageSize?: number;
  /** When true, return only approved events that need a marketing report (marketing_manager only) */
  needsMarketingReport?: boolean;
}

/**
 * Pagination info returned by GET /api/events
 */
export interface EventsPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginated response from GET /api/events
 */
export interface FetchEventsResponse {
  events: EventWithRelations[];
  pagination: EventsPagination;
}

/**
 * Fetch events with filters
 */
export async function fetchEvents(filters: EventFilters): Promise<FetchEventsResponse> {
  const params: Record<string, string | number> = {};

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      params.status = filters.status.join(",");
    } else {
      params.status = filters.status;
    }
  }
  if (filters.creatorId) params.creatorId = filters.creatorId;
  if (filters.venueId) params.venueId = filters.venueId;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.startsAtFrom) params.startsAtFrom = filters.startsAtFrom;
  if (filters.startsAtTo) params.startsAtTo = filters.startsAtTo;
  if (filters.search) params.search = filters.search;
  if (filters.state) params.state = filters.state;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  if (filters.needsMarketingReport === true) params.needsMarketingReport = "true";

  return apiClient.get<FetchEventsResponse>("/api/events", { params });
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(id: string): Promise<EventWithRelations> {
  return apiClient.get<EventWithRelations>(`/api/events/${id}`);
}

/**
 * Fetch a single event by short_id
 */
export async function fetchEventByShortId(shortId: string): Promise<EventWithRelations> {
  return apiClient.get<EventWithRelations>(`/api/events/short-id/${shortId}`);
}

/**
 * Create a draft event.
 * For Global Directors, include verificationToken to create the event as approved (no approval chain).
 */
export async function createEventDraft(
  input: CreateEventInput & { verificationToken?: string }
): Promise<EventWithRelations> {
  return apiClient.post<EventWithRelations>("/api/events", input);
}

/**
 * Update a draft event
 */
export async function updateEventDraft(id: string, input: UpdateEventInput): Promise<EventWithRelations> {
  return apiClient.put<EventWithRelations>(`/api/events/${id}`, input);
}

/**
 * Delete a draft event
 */
export async function deleteEventDraft(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/events/${id}`);
}

/**
 * Submit an event for approval
 */
export async function submitEventForApproval(id: string): Promise<EventWithRelations> {
  return apiClient.post<EventWithRelations>(`/api/events/${id}/submit`, {});
}

/**
 * Get the first (and only) draft for the current user
 * Returns null if no draft exists
 */
export async function fetchFirstDraft(): Promise<EventWithRelations | null> {
  return apiClient.get<EventWithRelations | null>("/api/events/drafts/first");
}

/**
 * Manually transition an event to completed_awaiting_report
 * Requires Global Director role
 */
export async function transitionEventToCompleted(id: string): Promise<void> {
  return apiClient.post<void>(`/api/events/${id}/transition`, {});
}

/**
 * Request modification for an approved event
 */
export async function requestModification(
  id: string,
  modificationData: CreateEventInput,
  changeReason?: string
): Promise<EventWithRelations> {
  return apiClient.post<EventWithRelations>(`/api/events/${id}/modify`, {
    modificationData,
    changeReason,
  });
}

/**
 * Fetch all versions for an event
 */
export async function fetchEventVersions(id: string): Promise<EventVersion[]> {
  const response = await fetch(`/api/events/${id}/versions`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch event versions");
  }

  return response.json();
}

/**
 * Fetch marketing reports for an event (includes submitted_by_name)
 */
export async function fetchMarketingReports(
  eventId: string
): Promise<import("@/lib/types/database.types").MarketingReportWithSubmitter[]> {
  return apiClient.get<import("@/lib/types/database.types").MarketingReportWithSubmitter[]>(
    `/api/events/${eventId}/marketing-reports`
  );
}

/** Payload to submit a marketing report (each report carries its own assets) */
export interface SubmitMarketingReportPayload {
  notes: string | null;
  marketing_flyers?: { url: string; name?: string }[];
  marketing_videos?: { url: string; name?: string }[];
  marketing_budget?: number | null;
}

/**
 * Submit a marketing report for an event (marketing_manager only).
 * Report includes notes and marketing assets (flyers, videos, budget) stored on marketing_reports table.
 */
export async function submitMarketingReport(
  eventId: string,
  payload: SubmitMarketingReportPayload
): Promise<import("@/lib/types/database.types").MarketingReport> {
  return apiClient.post<import("@/lib/types/database.types").MarketingReport>(
    `/api/events/${eventId}/marketing-reports`,
    payload
  );
}

/**
 * Upload a single marketing asset file (flyer or video). Returns { url, name }.
 */
export async function uploadEventMarketingAsset(
  eventId: string,
  file: File,
  type: "flyer" | "video"
): Promise<{ url: string; name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const res = await fetch(`/api/events/${eventId}/marketing-assets/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed");
  }

  const data = await res.json();
  return data.data;
}
