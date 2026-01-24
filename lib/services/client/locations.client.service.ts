/**
 * Locations Client Service
 *
 * Client-side service for location operations
 * Makes API calls to /api/locations endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";

/**
 * Location type
 */
export interface Location {
  id: string;
  name: string;
  code: string | null;
  type: "country" | "state" | "city";
  parent_id: string | null;
  is_active: boolean;
}

/**
 * Fetch countries
 */
export async function fetchCountries(): Promise<Location[]> {
  return apiClient.get<Location[]>("/api/locations", {
    params: { type: "countries" } as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Fetch states by country
 */
export async function fetchStatesByCountry(countryId: string): Promise<Location[]> {
  return apiClient.get<Location[]>("/api/locations", {
    params: { type: "states", countryId } as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Fetch cities by state
 */
export async function fetchCitiesByState(stateId: string): Promise<Location[]> {
  return apiClient.get<Location[]>("/api/locations", {
    params: { type: "cities", stateId } as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Fetch location by ID
 */
export async function fetchLocationById(id: string): Promise<Location> {
  return apiClient.get<Location>("/api/locations", {
    params: { id } as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Fetch default country
 */
export async function fetchDefaultCountry(): Promise<Location> {
  return apiClient.get<Location>("/api/locations", {
    params: { type: "default-country" } as Record<string, string | number | boolean | null | undefined>,
  });
}
