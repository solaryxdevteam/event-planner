/**
 * Venue Client Service
 *
 * Client-side service for venue operations
 * Makes API calls to /api/venues endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { VenueWithCreator, VenueStatusFilter } from "@/lib/data-access/venues.dal";
import type { CreateVenueInput, UpdateVenueInput } from "@/lib/validation/venues.schema";
import type { PaginatedVenues } from "@/lib/data-access/venues.dal";

/**
 * Venue filters for GET request
 */
export interface VenueFilters {
  search?: string;
  status?: VenueStatusFilter;
  totalCapacityMin?: number;
  totalCapacityMax?: number;
  numberOfTablesMin?: number;
  numberOfTablesMax?: number;
  ticketCapacityMin?: number;
  ticketCapacityMax?: number;
  page?: number;
  pageSize?: number;
  onlyOwn?: boolean;
}

/**
 * Fetch venues with search (for VenueSelect)
 */
export async function fetchVenuesWithSearch(search?: string): Promise<VenueWithCreator[]> {
  const result = await apiClient.get<PaginatedVenues>("/api/venues", {
    params: {
      search: search || undefined,
      status: "active",
      pageSize: 1000,
    },
  });

  return result.data;
}

/**
 * Fetch venues with filters
 */
export async function fetchVenues(filters: VenueFilters): Promise<PaginatedVenues> {
  const params: Record<string, string | number | boolean | null | undefined> = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.totalCapacityMin !== undefined) params.totalCapacityMin = filters.totalCapacityMin;
  if (filters.totalCapacityMax !== undefined) params.totalCapacityMax = filters.totalCapacityMax;
  if (filters.numberOfTablesMin !== undefined) params.numberOfTablesMin = filters.numberOfTablesMin;
  if (filters.numberOfTablesMax !== undefined) params.numberOfTablesMax = filters.numberOfTablesMax;
  if (filters.ticketCapacityMin !== undefined) params.ticketCapacityMin = filters.ticketCapacityMin;
  if (filters.ticketCapacityMax !== undefined) params.ticketCapacityMax = filters.ticketCapacityMax;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  if (filters.onlyOwn !== undefined) params.onlyOwn = filters.onlyOwn;

  return apiClient.get<PaginatedVenues>("/api/venues", { params });
}

/**
 * Fetch a single venue by ID
 */
export async function fetchVenueById(id: string): Promise<VenueWithCreator> {
  return apiClient.get<VenueWithCreator>(`/api/venues/${id}`);
}

/**
 * Fetch a single venue by short ID
 */
export async function fetchVenueByShortId(shortId: string): Promise<VenueWithCreator> {
  return apiClient.get<VenueWithCreator>(`/api/venues/short-id/${shortId}`);
}

/**
 * Create a venue.
 * For Global Directors, include verificationToken from OTP verification (venue_create + create).
 */
export async function createVenue(
  input: CreateVenueInput & { verificationToken?: string }
): Promise<{ venue: VenueWithCreator; isDuplicate: boolean; duplicateVenue?: VenueWithCreator }> {
  return apiClient.post<{ venue: VenueWithCreator; isDuplicate: boolean; duplicateVenue?: VenueWithCreator }>(
    "/api/venues",
    input
  );
}

/**
 * Update a venue
 */
export async function updateVenue(id: string, input: UpdateVenueInput): Promise<VenueWithCreator> {
  return apiClient.put<VenueWithCreator>(`/api/venues/${id}`, input);
}

/**
 * Delete a venue
 */
export async function deleteVenue(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/venues/${id}`);
}

/**
 * Ban a venue
 */
export async function banVenue(id: string, reason?: string): Promise<void> {
  return apiClient.post<void>(`/api/venues/${id}/ban`, { reason });
}

/**
 * Unban a venue
 */
export async function unbanVenue(id: string): Promise<void> {
  return apiClient.post<void>(`/api/venues/${id}/unban`);
}

/**
 * Check for duplicate venue
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateVenue: {
    id: string;
    short_id: string | null;
    name: string;
    street: string | null;
    city: string;
    country: string | null;
  } | null;
}

export async function checkVenueDuplicate(
  name: string,
  street: string,
  city: string,
  country: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  return apiClient.post<DuplicateCheckResult>("/api/venues/check-duplicate", {
    name,
    street,
    city,
    country,
    excludeId,
  });
}

/**
 * Check if venue has upcoming events
 */
export async function checkVenueUpcomingEvents(venueId: string): Promise<boolean> {
  const result = await apiClient.get<{ hasUpcomingEvents: boolean }>(`/api/venues/${venueId}/upcoming-events`);
  return result.hasUpcomingEvents;
}

// =============================================
// Venue Templates
// =============================================

import type { VenueTemplate } from "@/lib/data-access/venue-templates.dal";

/**
 * Fetch all venue templates for the current user
 */
export async function fetchVenueTemplates(): Promise<VenueTemplate[]> {
  return apiClient.get<VenueTemplate[]>("/api/venues/templates");
}

/**
 * Fetch a single venue template by ID
 */
export async function fetchVenueTemplate(id: string): Promise<VenueTemplate> {
  return apiClient.get<VenueTemplate>(`/api/venues/templates/${id}`);
}

/**
 * Save a venue as a template
 */
export async function saveVenueAsTemplate(name: string, templateData: CreateVenueInput): Promise<VenueTemplate> {
  return apiClient.post<VenueTemplate>("/api/venues/templates", {
    name,
    template_data: templateData,
  });
}

/**
 * Update a venue template
 */
export async function updateVenueTemplate(
  id: string,
  updates: { name?: string; template_data?: CreateVenueInput }
): Promise<VenueTemplate> {
  return apiClient.put<VenueTemplate>(`/api/venues/templates/${id}`, updates);
}

/**
 * Delete a venue template
 */
export async function deleteVenueTemplate(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/venues/templates/${id}`);
}
