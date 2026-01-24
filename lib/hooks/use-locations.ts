/**
 * React Query hooks for location data
 *
 * @deprecated Use use-locations-api.ts instead (uses API routes)
 * This file is kept for backward compatibility but will be removed
 *
 * Re-exports from use-locations-api.ts for migration
 */

// Re-export from the new API-based hook
export {
  useCountries,
  useStatesByCountry,
  useCitiesByState,
  useLocationById,
  useDefaultCountry,
  type Location,
} from "./use-locations-api";

// Query keys for React Query (for backward compatibility)
export const locationKeys = {
  all: ["locations"] as const,
  countries: () => [...locationKeys.all, "countries"] as const,
  states: (countryId: string) => [...locationKeys.all, "states", countryId] as const,
  cities: (stateId: string) => [...locationKeys.all, "cities", stateId] as const,
  location: (id: string) => [...locationKeys.all, "location", id] as const,
  defaultCountry: () => [...locationKeys.all, "default-country"] as const,
};
