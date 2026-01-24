/**
 * React Query hooks for Locations API
 *
 * Uses client services to make API calls
 */

import { useQuery } from "@tanstack/react-query";
import * as locationClientService from "@/lib/services/client/locations.client.service";

// Re-export types from client service
export type { Location } from "@/lib/services/client/locations.client.service";

/**
 * React Query hook: Get countries
 * Cached for 1 hour since countries rarely change
 */
export function useCountries() {
  return useQuery({
    queryKey: ["locations", "countries"],
    queryFn: locationClientService.fetchCountries,
    staleTime: 60 * 60 * 1000, // 1 hour (countries don't change often)
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * React Query hook: Get states by country
 * Cached to prevent duplicate fetches
 */
export function useStatesByCountry(countryId: string | null) {
  return useQuery({
    queryKey: ["locations", "states", countryId],
    queryFn: () =>
      countryId
        ? locationClientService.fetchStatesByCountry(countryId)
        : Promise.reject(new Error("No country ID provided")),
    enabled: !!countryId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });
}

/**
 * React Query hook: Get cities by state
 * Cached to prevent duplicate fetches
 */
export function useCitiesByState(stateId: string | null) {
  return useQuery({
    queryKey: ["locations", "cities", stateId],
    queryFn: () =>
      stateId ? locationClientService.fetchCitiesByState(stateId) : Promise.reject(new Error("No state ID provided")),
    enabled: !!stateId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });
}

/**
 * React Query hook: Get location by ID
 * Cached to prevent duplicate fetches for the same location
 */
export function useLocationById(id: string | null) {
  return useQuery({
    queryKey: ["locations", id],
    queryFn: () => (id ? locationClientService.fetchLocationById(id) : Promise.reject(new Error("No ID provided"))),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes (locations don't change often)
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * React Query hook: Get default country
 * Cached for 1 hour since default country rarely changes
 */
export function useDefaultCountry() {
  return useQuery({
    queryKey: ["locations", "default-country"],
    queryFn: locationClientService.fetchDefaultCountry,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}
