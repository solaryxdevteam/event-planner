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
  return canViewData(userId, (venue as { creator_id: string }).creator_id);
}

/**
 * Check if userId can edit/delete a venue
 * Only event_planner and global_director can edit venues
 * User must be the venue creator or a superior of the creator
 *
 * @param userId - User requesting access
 * @param venueId - Venue ID to check
 * @returns True if userId can edit the venue
 */
export async function canEditVenue(userId: string, venueId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get user role and venue creator
  const [{ data: userData, error: userError }, { data: venueData, error: venueError }] = await Promise.all([
    supabase.from("users").select("role").eq("id", userId).single<{ role: string }>(),
    supabase.from("venues").select("creator_id").eq("id", venueId).single<{ creator_id: string }>(),
  ]);

  if (userError || !userData || venueError || !venueData) {
    return false;
  }

  // Only event_planner and global_director can edit venues
  if (userData.role !== "event_planner" && userData.role !== "global_director") {
    return false;
  }

  // If user is the creator, allow
  if (userId === venueData.creator_id) {
    return true;
  }

  // Check if user is a superior of the creator in the hierarchy
  const subordinateIds = await getSubordinateUserIds(userId);
  return subordinateIds.includes(venueData.creator_id);
}
