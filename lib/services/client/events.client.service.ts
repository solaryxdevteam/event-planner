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
}

/**
 * Fetch events with filters
 */
export async function fetchEvents(filters: EventFilters): Promise<EventWithRelations[]> {
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

  return apiClient.get<EventWithRelations[]>("/api/events", { params });
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(id: string): Promise<EventWithRelations> {
  return apiClient.get<EventWithRelations>(`/api/events/${id}`);
}

/**
 * Create a draft event
 */
export async function createEventDraft(input: CreateEventInput): Promise<EventWithRelations> {
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
