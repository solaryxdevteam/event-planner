/**
 * Permission Guards
 *
 * Functions that throw errors if permission checks fail
 * Used in server actions and API routes for authorization
 */

import * as pyramid from "./pyramid";
import * as roles from "./roles";
import type { Database } from "@/lib/types/database.types";

type Role = Database["public"]["Enums"]["role"];

/**
 * Require that user can view an event, throw error if not
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @throws Error if user cannot view event
 */
export async function requireCanViewEvent(userId: string, eventId: string): Promise<void> {
  const canView = await pyramid.canViewEvent(userId, eventId);
  if (!canView) {
    throw new Error("You do not have permission to view this event");
  }
}

/**
 * Require that user can edit an event, throw error if not
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @throws Error if user cannot edit event
 */
export async function requireCanEditEvent(userId: string, eventId: string): Promise<void> {
  const canEdit = await pyramid.canEditEvent(userId, eventId);
  if (!canEdit) {
    throw new Error("You do not have permission to edit this event");
  }
}

/**
 * Require that user can approve an event, throw error if not
 *
 * @param userId - User requesting access
 * @param eventId - Event ID to check
 * @throws Error if user is not an approver for this event
 */
export async function requireCanApprove(userId: string, eventId: string): Promise<void> {
  const canApprove = await pyramid.canApproveEvent(userId, eventId);
  if (!canApprove) {
    throw new Error("You are not authorized to approve this event");
  }
}

/**
 * Require that user can view a venue, throw error if not
 *
 * @param userId - User requesting access
 * @param venueId - Venue ID to check
 * @throws Error if user cannot view venue
 */
export async function requireCanViewVenue(userId: string, venueId: string): Promise<void> {
  const canView = await pyramid.canViewVenue(userId, venueId);
  if (!canView) {
    throw new Error("You do not have permission to view this venue");
  }
}

/**
 * Require that user can edit a venue, throw error if not
 *
 * @param userId - User requesting access
 * @param venueId - Venue ID to check
 * @throws Error if user cannot edit venue
 */
export async function requireCanEditVenue(userId: string, venueId: string): Promise<void> {
  const canEdit = await pyramid.canEditVenue(userId, venueId);
  if (!canEdit) {
    throw new Error("You do not have permission to edit this venue");
  }
}

/**
 * Require that user has one of the specified roles, throw error if not
 *
 * @param userId - User ID to check
 * @param allowedRoles - Array of allowed roles
 * @throws Error if user does not have required role
 */
export async function requireRole(userId: string, allowedRoles: Role[]): Promise<void> {
  const hasRequiredRole = await roles.hasRole(userId, allowedRoles);
  if (!hasRequiredRole) {
    throw new Error(`This action requires one of the following roles: ${allowedRoles.join(", ")}`);
  }
}

/**
 * Require that user is a Global Director, throw error if not
 *
 * @param userId - User ID to check
 * @throws Error if user is not a Global Director
 */
export async function requireGlobalDirector(userId: string): Promise<void> {
  const isGD = await roles.isGlobalDirector(userId);
  if (!isGD) {
    throw new Error("This action requires Global Director permissions");
  }
}

/**
 * Require that user is a curator (any level), throw error if not
 *
 * @param userId - User ID to check
 * @throws Error if user is not a curator
 */
export async function requireCurator(userId: string): Promise<void> {
  const isCur = await roles.isCurator(userId);
  if (!isCur) {
    throw new Error("This action requires curator-level permissions");
  }
}

/**
 * Require that user can view target user's data, throw error if not
 *
 * @param userId - User requesting access
 * @param targetUserId - Target user whose data is being accessed
 * @throws Error if user cannot view target user's data
 */
export async function requireCanViewUserData(userId: string, targetUserId: string): Promise<void> {
  const canView = await pyramid.canViewData(userId, targetUserId);
  if (!canView) {
    throw new Error("You do not have permission to view this user's data");
  }
}
