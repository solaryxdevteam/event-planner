/**
 * Venue display status
 *
 * Derives a single UI-facing status from approval_status + is_active
 * so the UI can show one clear label (Pending approval, Active, Rejected, Banned).
 */

export type VenueDisplayStatus = "pending_approval" | "active" | "rejected" | "banned";

export interface VenueStatusFields {
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
}

export const VENUE_DISPLAY_STATUS_LABELS: Record<VenueDisplayStatus, string> = {
  pending_approval: "Pending approval",
  active: "Active",
  rejected: "Rejected",
  banned: "Banned",
};

/**
 * Returns a single display status for UI (badges, filters, labels).
 * - Banned: approved but is_active = false
 * - Pending approval: approval_status = 'pending'
 * - Rejected: approval_status = 'rejected'
 * - Active: approved and is_active = true
 */
export function getVenueDisplayStatus(venue: VenueStatusFields): VenueDisplayStatus {
  if (!venue.is_active && venue.approval_status === "approved") {
    return "banned";
  }
  if (venue.approval_status === "pending") {
    return "pending_approval";
  }
  if (venue.approval_status === "rejected") {
    return "rejected";
  }
  return "active";
}
