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
import { requireActiveUser } from "@/lib/auth/server";
import { UserRole } from "@/lib/types/roles";
import { isGlobalDirector } from "@/lib/permissions/roles";
import * as eventDAL from "@/lib/data-access/events.dal";
import { buildApprovalChain } from "@/lib/services/approvals/chain-builder.service";
import * as venueApprovalDAL from "@/lib/data-access/venue-approvals.dal";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";
import * as venueContactVerificationService from "@/lib/services/venues/venue-contact-verification.service";

type Venue = Database["public"]["Tables"]["venues"]["Row"];

/**
 * Get all venues visible to the current user
 * Implements pyramid visibility through backend authorization
 * Global directors and marketing managers can see all venues (read-only for marketing)
 */
export async function getVenues(options?: { search?: string }): Promise<VenueWithCreator[]> {
  const user = await requireActiveUser();

  const isGD = await isGlobalDirector(user.id);
  const isMarketingManager = user.dbUser.role === UserRole.MARKETING_MANAGER;
  const subordinateIds = isGD || isMarketingManager ? null : await getSubordinateUserIds(user.id);

  if (options?.search && options.search.trim().length > 0) {
    return venueDAL.search(options.search.trim(), subordinateIds, true);
  }

  return venueDAL.findAll(subordinateIds, { includeCreator: true, activeOnly: true });
}

/**
 * Get venues with filters and pagination
 * All filters use AND logic (all must match)
 */
export async function getVenuesWithFilters(filters: venueDAL.VenueFilterOptions): Promise<venueDAL.PaginatedVenues> {
  const user = await requireActiveUser();

  const isGD = await isGlobalDirector(user.id);
  const isMarketingManager = user.dbUser.role === UserRole.MARKETING_MANAGER;
  const subordinateIds =
    isGD || isMarketingManager ? null : filters.onlyOwn ? [user.id] : await getSubordinateUserIds(user.id);

  return venueDAL.findAllWithFilters(subordinateIds, filters);
}

/**
 * Get a single venue by short_id
 * Checks visibility permissions via backend authorization
 * Global directors can see all venues
 */
export async function getVenueByShortId(shortId: string): Promise<VenueWithCreator> {
  const user = await requireActiveUser();

  // Global directors can see all venues
  const isGD = await isGlobalDirector(user.id);
  const subordinateIds = isGD ? null : await getSubordinateUserIds(user.id);

  const venue = await venueDAL.findByShortId(shortId, subordinateIds, true);

  if (!venue) {
    throw new NotFoundError("Venue", shortId);
  }

  return venue;
}

/**
 * Get a single venue by ID (for backward compatibility)
 * Checks visibility permissions via backend authorization
 */
export async function getVenueById(id: string): Promise<VenueWithCreator> {
  const user = await requireActiveUser();

  const isGD = await isGlobalDirector(user.id);
  const isMarketingManager = user.dbUser.role === UserRole.MARKETING_MANAGER;
  const subordinateIds = isGD || isMarketingManager ? null : await getSubordinateUserIds(user.id);

  const venue = await venueDAL.findById(id, subordinateIds, true);

  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  return venue;
}

/**
 * Create a new venue
 * - Only event_planner and global_director can create venues
 * - Global directors must supply a valid OTP verification token (obtained after verifying email OTP)
 * - Checks for duplicates (same name, address, city, country)
 * - Logs audit trail
 */
export async function createVenue(
  input: CreateVenueInput,
  verificationToken?: string
): Promise<{ venue: Venue; isDuplicate: boolean; duplicateVenue?: Venue }> {
  const user = await requireActiveUser();

  // Check if user has permission to create venues
  if (user.dbUser.role !== UserRole.EVENT_PLANNER && user.dbUser.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new ForbiddenError("Only Event Planners and Global Directors can create venues");
  }

  // Global directors must verify via OTP before creating a venue
  if (user.dbUser.role === UserRole.GLOBAL_DIRECTOR) {
    await verificationOtpService.consumeVerificationToken(
      user.id,
      "venue_create",
      user.id,
      "create",
      verificationToken ?? ""
    );
  }

  // Check for duplicates
  const duplicate = await venueDAL.findDuplicate(input.name, input.street, input.city, input.country);

  if (duplicate) {
    // Return duplicate info but don't throw error yet
    // Let the UI decide whether to proceed or warn the user
    return {
      venue: duplicate,
      isDuplicate: true,
      duplicateVenue: duplicate,
    };
  }

  // Build full address from street, city, country
  const fullAddress = [input.street, input.city, input.country].filter(Boolean).join(", ");

  // Global Director: no approval chain; venue is approved as soon as OTP is verified at create.
  // Event Planner: same hierarchy as events; venue is pending until chain completes.
  const isGD = user.dbUser.role === UserRole.GLOBAL_DIRECTOR;
  const approverIds = isGD ? [] : await buildApprovalChain(user.id);

  const venue = await venueDAL.insert({
    short_id: null, // Will be generated by the DAL
    name: input.name,
    address: fullAddress,
    street: input.street,
    city: input.city,
    country: input.country || "United States",
    country_id: input.country_id ?? null,
    location_lat: input.location_lat ?? null,
    location_lng: input.location_lng ?? null,
    total_capacity: input.total_capacity ?? null,
    number_of_tables: input.number_of_tables ?? null,
    ticket_capacity: input.ticket_capacity ?? null,
    sounds: input.sounds?.trim() || null,
    lights: input.lights?.trim() || null,
    screens: input.screens?.trim() || null,
    floor_plans: input.floor_plans ?? [],
    contact_person_name: input.contact_person_name,
    contact_email: input.contact_email ?? null,
    contact_email_verified: false,
    media: input.media ?? [],
    creator_id: user.id,
    is_active: approverIds.length === 0,
    approval_status: approverIds.length === 0 ? "approved" : "pending",
  });

  if (approverIds.length > 0) {
    await venueApprovalDAL.createChain(venue.id, approverIds);
  }

  // Log audit trail
  await logAuditAction("create_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.street || venue.address,
    venue_city: venue.city,
  });

  // Send contact verification email automatically when venue has a contact email
  if (venue.contact_email?.trim()) {
    try {
      await venueContactVerificationService.sendVerificationEmail(venue.id);
    } catch (err) {
      console.error("Failed to send venue contact verification email after create:", err);
      // Don't fail venue creation; contact can request verification from edit page
    }
  }

  return {
    venue,
    isDuplicate: false,
  };
}

/**
 * Update an existing venue
 * - User must be the venue creator or a superior of the creator (hierarchy)
 * - Checks for duplicates if name/address/city changed
 * - Logs audit trail
 */
export async function updateVenue(id: string, input: UpdateVenueInput): Promise<Venue> {
  const user = await requireActiveUser();

  // Get subordinate user IDs for authorization (visibility = can edit)
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue (with authorization check)
  const existingVenue = await venueDAL.findById(id, subordinateIds, false);
  if (!existingVenue) {
    throw new NotFoundError("Venue", id);
  }

  // Check permissions: user must be the creator or their superior
  await checkVenuePermission(user.id, existingVenue.creator_id);

  // Check for duplicates if key fields changed
  if (input.name || input.street || input.city || input.country) {
    const newName = input.name ?? existingVenue.name;
    const newStreet = input.street ?? existingVenue.street ?? "";
    const newCity = input.city ?? existingVenue.city;
    const newCountry = input.country ?? (existingVenue.country || "");

    const duplicate = await venueDAL.findDuplicate(newName, newStreet, newCity, newCountry, id);

    if (duplicate) {
      throw new ConflictError("A venue with the same name, address, city, and country already exists", {
        duplicateId: duplicate.id,
      });
    }
  }

  // Build full address if street/city/country changed
  let fullAddress = existingVenue.address;
  if (input.street || input.city || input.country) {
    const street = input.street ?? existingVenue.street ?? "";
    const city = input.city ?? existingVenue.city;
    const country = input.country ?? existingVenue.country;
    fullAddress = [street, city, country].filter(Boolean).join(", ");
  }

  // Update the venue
  const updatedVenue = await venueDAL.update(id, {
    name: input.name,
    address: fullAddress,
    street: input.street,
    city: input.city,
    country: input.country,
    country_id: input.country_id,
    location_lat: input.location_lat,
    location_lng: input.location_lng,
    total_capacity: input.total_capacity,
    number_of_tables: input.number_of_tables,
    ticket_capacity: input.ticket_capacity,
    sounds: input.sounds !== undefined ? input.sounds?.trim() || null : undefined,
    lights: input.lights !== undefined ? input.lights?.trim() || null : undefined,
    screens: input.screens !== undefined ? input.screens?.trim() || null : undefined,
    floor_plans: input.floor_plans,
    contact_person_name: input.contact_person_name,
    contact_email: input.contact_email,
    media: input.media,
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
  const user = await requireActiveUser();

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
    venue_address: venue.street || venue.address,
    venue_city: venue.city,
  });
}

/**
 * Ban a venue (soft delete with admin override)
 * - Only Global Directors can ban venues
 * - Can ban any venue regardless of creator (no subordinate filtering for admins)
 * - Cannot ban venues with upcoming events
 * - Logs audit trail with ban reason
 */
export async function banVenue(id: string, reason?: string): Promise<void> {
  const user = await requireActiveUser();

  // Check if user is Global Director
  if (user.dbUser.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new ForbiddenError("Only Global Directors can ban venues");
  }

  // Note: Global Directors can see all venues, so we pass their full subordinate list
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue
  const venue = await venueDAL.findById(id, subordinateIds, false);
  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  // Check if venue has upcoming events
  const hasUpcoming = await eventDAL.hasUpcomingEvents(id);
  if (hasUpcoming) {
    throw new ForbiddenError(
      "Cannot ban venue: This venue has upcoming events. Please cancel or reschedule all upcoming events before banning the venue."
    );
  }

  // Ban (set is_active = false; venue remains visible in banned filter)
  await venueDAL.banVenue(id);

  // Log audit trail with ban reason
  await logAuditAction("ban_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.street || venue.address,
    venue_city: venue.city,
    ban_reason: reason,
    banned_by: user.dbUser.first_name + (user.dbUser.last_name ? ` ${user.dbUser.last_name}` : ""),
  });
}

/**
 * Unban a venue (reactivate a banned venue)
 * - Only Global Directors can unban venues
 * - Can unban any venue regardless of creator (no subordinate filtering for admins)
 * - Logs audit trail
 */
export async function unbanVenue(id: string): Promise<void> {
  const user = await requireActiveUser();

  // Check if user is Global Director
  if (user.dbUser.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new ForbiddenError("Only Global Directors can unban venues");
  }

  // Note: Global Directors can see all venues, so we pass their full subordinate list
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Get the existing venue (including banned venues)
  const venue = await venueDAL.findById(id, subordinateIds, false);
  if (!venue) {
    throw new NotFoundError("Venue", id);
  }

  // Check if venue is already active
  if (venue.is_active) {
    throw new Error("Venue is already active");
  }

  // Unban (reactivate)
  await venueDAL.unbanVenue(id);

  // Log audit trail
  await logAuditAction("unban_venue", user.id, venue.id, {
    venue_name: venue.name,
    venue_address: venue.street || venue.address,
    venue_city: venue.city,
    unbanned_by: user.dbUser.first_name + (user.dbUser.last_name ? ` ${user.dbUser.last_name}` : ""),
  });
}

/**
 * User can modify venue if they are the creator or a superior of the creator in the hierarchy.
 */
async function checkVenuePermission(userId: string, creatorId: string): Promise<void> {
  if (userId === creatorId) {
    return;
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  if (!subordinateIds.includes(creatorId)) {
    throw new ForbiddenError("You do not have permission to modify this venue");
  }
}

/**
 * Helper: Log audit action
 */
async function logAuditAction(
  actionType: "create_venue" | "update_venue" | "delete_venue" | "ban_venue" | "unban_venue",
  userId: string,
  venueId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // @ts-expect-error - Supabase type inference issue with Database types
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
