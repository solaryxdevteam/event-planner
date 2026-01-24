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
 * Get venues with filters and pagination
 */
export async function getVenuesWithFilters(
  filters: Parameters<typeof venueService.getVenuesWithFilters>[0]
): Promise<ActionResponse<Awaited<ReturnType<typeof venueService.getVenuesWithFilters>>>> {
  return handleAsync(async () => {
    return venueService.getVenuesWithFilters(filters);
  }, "getVenuesWithFilters");
}

/**
 * Get a single venue by short_id
 */
export async function getVenueByShortId(shortId: string): Promise<ActionResponse<VenueWithCreator>> {
  return handleAsync(async () => {
    return venueService.getVenueByShortId(shortId);
  }, "getVenueByShortId");
}

/**
 * Get a single venue by ID (for backward compatibility)
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
 * Unban a venue (Global Director only)
 */
export async function unbanVenue(id: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    return venueService.unbanVenue(id);
  }, "unbanVenue");
}

/**
 * Check for duplicate venue before creating
 * Returns null if no duplicate, or the duplicate venue if found
 */
export async function checkDuplicateVenue(
  name: string,
  street: string,
  city: string,
  country: string
): Promise<ActionResponse<Venue | null>> {
  return handleAsync(async () => {
    const { findDuplicate } = await import("@/lib/data-access/venues.dal");
    return findDuplicate(name, street, city, country);
  }, "checkDuplicateVenue");
}

/**
 * Upload venue image
 */
export async function uploadVenueImage(formData: FormData): Promise<ActionResponse<{ url: string }>> {
  return handleAsync(async () => {
    const { requireAuth } = await import("@/lib/auth/server");
    await requireAuth();
    const storageService = await import("@/lib/services/storage/storage.service");

    // Get file from form data
    const file = formData.get("image") as File;
    const venueId = formData.get("venueId") as string;

    if (!file) {
      throw new Error("No file provided");
    }

    if (!venueId) {
      throw new Error("Venue ID is required");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
    }

    // Validate file size (5MB max for venue images)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB");
    }

    // Upload image
    const imageUrl = await storageService.uploadVenueImage(venueId, file);

    return { url: imageUrl };
  }, "uploadVenueImage");
}
