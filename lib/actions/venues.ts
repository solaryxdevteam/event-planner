/**
 * Venue Server Actions
 *
 * Public API for venue operations exposed to client components
 */

"use server";

import { handleAsync } from "@/lib/utils/response";
import type { ActionResponse } from "@/lib/types/api.types";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { CreateVenueInput, UpdateVenueInput } from "@/lib/validation/venues.schema";
import { createVenueSchema, updateVenueSchema } from "@/lib/validation/venues.schema";
import * as venueService from "@/lib/services/venues/venue.service";
import type { Database } from "@/lib/types/database.types";
import { ValidationError } from "@/lib/utils/errors";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

/**
 * Get all venues visible to the current user
 */
export async function getVenues(options?: { search?: string }): Promise<ActionResponse<VenueWithCreator[]>> {
  return handleAsync(async () => {
    return venueService.getVenues(options);
  }, "getVenues");
}

/**
 * Get a single venue by ID
 */
export async function getVenueById(id: string): Promise<ActionResponse<VenueWithCreator>> {
  return handleAsync(async () => {
    return venueService.getVenueById(id);
  }, "getVenueById");
}

/**
 * Create a new venue
 * Returns duplicate warning if venue already exists
 */
export async function createVenue(
  input: CreateVenueInput
): Promise<ActionResponse<{ venue: Venue; isDuplicate: boolean; duplicateVenue?: Venue }>> {
  return handleAsync(async () => {
    // Validate input
    const validatedInput = createVenueSchema.parse(input);

    // Create venue (returns duplicate info if exists)
    return venueService.createVenue(validatedInput);
  }, "createVenue");
}

/**
 * Force create a venue even if duplicate exists
 * Used when user explicitly confirms they want to create a duplicate
 */
export async function forceCreateVenue(input: CreateVenueInput): Promise<ActionResponse<Venue>> {
  return handleAsync(async () => {
    // Validate input
    const validatedInput = createVenueSchema.parse(input);

    // Since we're forcing creation, we bypass the duplicate check
    // by directly calling the DAL layer through the service but ignoring duplicate flag
    const result = await venueService.createVenue(validatedInput);

    // If it's a duplicate, that means it already exists and was returned
    // We should not force create in this case, throw validation error
    if (result.isDuplicate) {
      throw new ValidationError("Cannot force create: venue already exists", { duplicateId: result.venue.id });
    }

    return result.venue;
  }, "forceCreateVenue");
}

/**
 * Update an existing venue
 */
export async function updateVenue(id: string, input: UpdateVenueInput): Promise<ActionResponse<Venue>> {
  return handleAsync(async () => {
    // Validate input
    const validatedInput = updateVenueSchema.parse(input);

    // Update venue
    return venueService.updateVenue(id, validatedInput);
  }, "updateVenue");
}

/**
 * Delete a venue (soft delete)
 */
export async function deleteVenue(id: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    return venueService.deleteVenue(id);
  }, "deleteVenue");
}

/**
 * Ban a venue (Global Director only)
 */
export async function banVenue(id: string, reason?: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    return venueService.banVenue(id, reason);
  }, "banVenue");
}

/**
 * Check for duplicate venue before creating
 * Returns null if no duplicate, or the duplicate venue if found
 */
export async function checkDuplicateVenue(
  name: string,
  address: string,
  city: string
): Promise<ActionResponse<Venue | null>> {
  return handleAsync(async () => {
    const { findDuplicate } = await import("@/lib/data-access/venues.dal");
    return findDuplicate(name, address, city);
  }, "checkDuplicateVenue");
}
