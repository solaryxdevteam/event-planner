/**
 * Venue Client Service
 *
 * Client-side service for venue operations
 * Makes API calls to /api/venues endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { CreateVenueInput, UpdateVenueInput } from "@/lib/validation/venues.schema";
import type { PaginatedVenues } from "@/lib/data-access/venues.dal";

/**
 * Venue filters for GET request
 */
export interface VenueFilters {
  search?: string;
  state?: string | null;
  status?: "all" | "active" | "banned";
  specs?: string[];
  dateFrom?: string;
  dateTo?: string;
  standingMin?: number;
  standingMax?: number;
  seatedMin?: number;
  seatedMax?: number;
  page?: number;
  pageSize?: number;
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
  if (filters.state && filters.state !== "all") params.state = filters.state;
  if (filters.status) params.status = filters.status;
  if (filters.specs && filters.specs.length > 0) params.specs = filters.specs.join(",");
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.standingMin !== undefined) params.standingMin = filters.standingMin;
  if (filters.standingMax !== undefined) params.standingMax = filters.standingMax;
  if (filters.seatedMin !== undefined) params.seatedMin = filters.seatedMin;
  if (filters.seatedMax !== undefined) params.seatedMax = filters.seatedMax;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;

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
 * Create a venue
 */
export async function createVenue(
  input: CreateVenueInput
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
