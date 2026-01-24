/**
 * Pyramid Visibility Permissions
 *
 * Functions to check if a user can view/edit data based on hierarchy
 * Users can see data from themselves and their subordinates (pyramid visibility)
 */

import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if userId can view targetUserId's data (pyramid visibility)
 *
 * @param userId - User requesting access
 * @param targetUserId - User whose data is being accessed
 * @returns True if userId can view targetUserId's data
 */
export async function canViewData(userId: string, targetUserId: string): Promise<boolean> {
  // Users can always view their own data
  if (userId === targetUserId) {
    return true;
  }

  // Get all subordinate user IDs (includes self)
  const subordinateIds = await getSubordinateUserIds(userId);

  // Check if target user is in subordinates list
  return subordinateIds.includes(targetUserId);
}

/**
 * Check if userId can view an event
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @returns True if userId can view the event
 */
export async function canViewEvent(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get event creator
  const { data: event, error } = await supabase.from("events").select("creator_id").eq("id", eventId).single();

  if (error || !event) {
    return false;
  }

  // Check if user can view event creator's data
  // @ts-expect-error - Supabase type inference issue with Database types
  return canViewData(userId, (event as { creator_id: string }).creator_id);
}

/**
 * Check if userId can edit an event
 * Only the event creator can edit their events
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @returns True if userId can edit the event
 */
export async function canEditEvent(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get event creator
  const { data: event, error } = await supabase.from("events").select("creator_id").eq("id", eventId).single();

  if (error || !event) {
    return false;
  }

  // Only creator can edit
  // @ts-expect-error - Supabase type inference issue with Database types
  return userId === (event as { creator_id: string }).creator_id;
}

/**
 * Check if userId can approve an event
 * User must be in the event's approval chain
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @returns True if userId is an approver for this event
 */
export async function canApproveEvent(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is in approval chain for this event
  const { data: approval, error } = await supabase
    .from("event_approvals")
    .select("id")
    .eq("event_id", eventId)
    .eq("approver_id", userId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!approval;
}

/**
 * Get array of user IDs visible to a user (self + subordinates)
 * Used for filtering queries
 *
 * @param userId - User ID
 * @returns Array of visible user IDs
 */
export async function getVisibleUserIds(userId: string): Promise<string[]> {
  return getSubordinateUserIds(userId);
}

/**
 * Check if userId can view a venue
 * Users can view venues created by themselves or their subordinates
 *
 * @param userId - User requesting access
 * @param venueId - Venue ID to check
 * @returns True if userId can view the venue
 */
export async function canViewVenue(userId: string, venueId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get venue creator
  const { data: venue, error } = await supabase.from("venues").select("creator_id").eq("id", venueId).single();

  if (error || !venue) {
    return false;
  }

  // Check if user can view venue creator's data
  // @ts-expect-error - Supabase type inference issue with Database types
  return canViewData(userId, (venue as { creator_id: string }).creator_id);
}

/**
 * Check if userId can edit/delete a venue
 * Only the venue creator or Global Director can edit
 *
 * @param userId - User requesting access
 * @param venueId - Venue ID to check
 * @returns True if userId can edit the venue
 */
export async function canEditVenue(userId: string, venueId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get user role and venue creator
  const [userResult, venueResult] = await Promise.all([
    supabase.from("users").select("role").eq("id", userId).single(),
    supabase.from("venues").select("creator_id").eq("id", venueId).single(),
  ]);

  if (userResult.error || venueResult.error || !userResult.data || !venueResult.data) {
    return false;
  }

  // Global Directors can edit any venue
  // @ts-expect-error - Supabase type inference issue with Database types
  if ((userResult.data as { role: string })?.role === "global_director") {
    return true;
  }

  // Creators can edit their own venues
  // @ts-expect-error - Supabase type inference issue with Database types
  return userId === (venueResult.data as { creator_id: string })?.creator_id;
}
