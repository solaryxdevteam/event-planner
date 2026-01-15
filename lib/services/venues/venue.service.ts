/**
 * Venue Service
 *
 * Business logic layer for venue operations
 * Includes duplicate checking, permissions, and audit logging
 *
 * IMPORTANT: All authorization is handled in this service layer.
 * This application does NOT use RLS - all access control is backend-only.
 */

import { ConflictError, NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as venueDAL from "@/lib/data-access/venues.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { CreateVenueInput, UpdateVenueInput } from "@/lib/validation/venues.schema";
import type { Database } from "@/lib/types/database.types";
import { createClient } from "@/lib/supabase/server";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

// Temporary user type for testing (will be replaced with proper auth)
type TempUser = {
  id: string;
  dbUser?: {
    name: string;
  };
};

/**
 * Get all venues visible to the current user
 * Implements pyramid visibility through backend authorization
 */
export async function getVenues(options?: { search?: string }): Promise<VenueWithCreator[]> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireActiveUser();
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000" };

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(user.id);

  if (options?.search && options.search.trim().length > 0) {
    return venueDAL.search(options.search.trim(), subordinateIds, true);
  }

  return venueDAL.findAll(subordinateIds, { includeCreator: true, activeOnly: true });
}

/**
 * Get a single venue by ID
 * Checks visibility permissions via backend authorization
 */
export async function getVenueById(id: string): Promise<VenueWithCreator> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireActiveUser();
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000" };

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(user.id);

  const venue = await venueDAL.findById(id, subordinateIds, true);

  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  return venue;
}

/**
 * Create a new venue
 * - Checks for duplicates (same name, address, city)
 * - Logs audit trail
 */
export async function createVenue(
  input: CreateVenueInput
): Promise<{ venue: Venue; isDuplicate: boolean; duplicateVenue?: Venue }> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireActiveUser();
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000" };

  // Check for duplicates
  const duplicate = await venueDAL.findDuplicate(input.name, input.address, input.city);

  if (duplicate) {
    // Return duplicate info but don't throw error yet
    // Let the UI decide whether to proceed or warn the user
    return {
      venue: duplicate,
      isDuplicate: true,
      duplicateVenue: duplicate,
    };
  }

  // Create the venue
  const venue = await venueDAL.insert({
    name: input.name,
    address: input.address,
    city: input.city,
    capacity: input.capacity ?? null,
    notes: input.notes ?? null,
    creator_id: user.id,
    is_active: true,
  });

  // Log audit trail
  await logAuditAction("create_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.address,
    venue_city: venue.city,
  });

  return {
    venue,
    isDuplicate: false,
  };
}

/**
 * Update an existing venue
 * - Checks ownership or hierarchy permissions via backend authorization
 * - Checks for duplicates if name/address/city changed
 * - Logs audit trail
 */
export async function updateVenue(id: string, input: UpdateVenueInput): Promise<Venue> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireActiveUser();
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000" };

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue (with authorization check)
  const existingVenue = await venueDAL.findById(id, subordinateIds, false);
  if (!existingVenue) {
    throw new NotFoundError("Venue", id);
  }

  // Check permissions: user must be the creator or their superior
  await checkVenuePermission(user.id, existingVenue.creator_id);

  // Check for duplicates if key fields changed
  if (input.name || input.address || input.city) {
    const newName = input.name ?? existingVenue.name;
    const newAddress = input.address ?? existingVenue.address;
    const newCity = input.city ?? existingVenue.city;

    const duplicate = await venueDAL.findDuplicate(newName, newAddress, newCity, id);

    if (duplicate) {
      throw new ConflictError("A venue with the same name, address, and city already exists", {
        duplicateId: duplicate.id,
      });
    }
  }

  // Update the venue
  const updatedVenue = await venueDAL.update(id, {
    name: input.name,
    address: input.address,
    city: input.city,
    capacity: input.capacity,
    notes: input.notes,
  });

  // Log audit trail
  await logAuditAction("update_venue", user.id, updatedVenue.id, {
    venue_name: updatedVenue.name,
    old_data: existingVenue,
    new_data: updatedVenue,
  });

  return updatedVenue;
}

/**
 * Delete (soft delete) a venue
 * - Checks ownership or hierarchy permissions via backend authorization
 * - Logs audit trail
 */
export async function deleteVenue(id: string): Promise<void> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireActiveUser();
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000" };

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue (with authorization check)
  const venue = await venueDAL.findById(id, subordinateIds, false);
  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  // Check permissions: user must be the creator or their superior
  await checkVenuePermission(user.id, venue.creator_id);

  // Soft delete
  await venueDAL.softDelete(id);

  // Log audit trail
  await logAuditAction("delete_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.address,
    venue_city: venue.city,
  });
}

/**
 * Ban a venue (soft delete with admin override)
 * - Only Global Directors can ban venues
 * - Can ban any venue regardless of creator (no subordinate filtering for admins)
 * - Logs audit trail with ban reason
 */
export async function banVenue(id: string, reason?: string): Promise<void> {
  // TODO: Temporarily using a valid UUID for testing
  // Uncomment the line below when authentication is ready:
  // const user = await requireRole(["global_director"]);
  const user: TempUser = { id: "00000000-0000-0000-0000-000000000000", dbUser: { name: "Test User" } };

  // Note: Global Directors can see all venues, so we pass their full subordinate list
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue
  const venue = await venueDAL.findById(id, subordinateIds, false);
  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  // Soft delete (ban)
  await venueDAL.softDelete(id);

  // Log audit trail with ban reason
  await logAuditAction("ban_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.address,
    venue_city: venue.city,
    ban_reason: reason,
    banned_by: user.dbUser.name,
  });
}

/**
 * Helper: Check if user has permission to modify a venue
 * User can modify if:
 * 1. They are the creator
 * 2. They are a superior of the creator in the hierarchy
 */
async function checkVenuePermission(userId: string, creatorId: string): Promise<void> {
  // If user is the creator, allow
  if (userId === creatorId) {
    return;
  }

  // Check if user is a superior in the hierarchy
  const subordinateIds = await getSubordinateUserIds(userId);

  if (!subordinateIds.includes(creatorId)) {
    throw new ForbiddenError("You do not have permission to modify this venue");
  }
}

/**
 * Helper: Log audit action
 */
async function logAuditAction(
  actionType: "create_venue" | "update_venue" | "delete_venue" | "ban_venue",
  userId: string,
  venueId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("audit_logs").insert({
    action_type: actionType,
    user_id: userId,
    event_id: null, // Venue actions don't have an event_id
    metadata: {
      venue_id: venueId,
      ...metadata,
    },
  });
}
