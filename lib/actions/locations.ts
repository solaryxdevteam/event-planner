/**
 * Locations Server Actions
 *
 * Public API for location operations exposed to client components
 */

"use server";

import { handleAsync } from "@/lib/utils/response";
import type { ActionResponse } from "@/lib/types/api.types";
import * as locationsDAL from "@/lib/data-access/locations.dal";

/**
 * Get all countries
 */
export async function getCountries(): Promise<ActionResponse<Awaited<ReturnType<typeof locationsDAL.getCountries>>>> {
  return handleAsync(async () => {
    return locationsDAL.getCountries();
  }, "getCountries");
}

/**
 * Get all states for a given country
 */
export async function getStatesByCountry(
  countryId: string
): Promise<ActionResponse<Awaited<ReturnType<typeof locationsDAL.getStatesByCountry>>>> {
  return handleAsync(async () => {
    return locationsDAL.getStatesByCountry(countryId);
  }, "getStatesByCountry");
}

/**
 * Get all cities for a given state
 */
export async function getCitiesByState(
  stateId: string
): Promise<ActionResponse<Awaited<ReturnType<typeof locationsDAL.getCitiesByState>>>> {
  return handleAsync(async () => {
    return locationsDAL.getCitiesByState(stateId);
  }, "getCitiesByState");
}

/**
 * Get default country (USA)
 */
export async function getDefaultCountry(): Promise<
  ActionResponse<Awaited<ReturnType<typeof locationsDAL.getDefaultCountry>>>
> {
  return handleAsync(async () => {
    return locationsDAL.getDefaultCountry();
  }, "getDefaultCountry");
}

/**
 * Get location by ID
 */
export async function getLocationById(
  id: string
): Promise<ActionResponse<Awaited<ReturnType<typeof locationsDAL.getLocationById>>>> {
  return handleAsync(async () => {
    return locationsDAL.getLocationById(id);
  }, "getLocationById");
}
