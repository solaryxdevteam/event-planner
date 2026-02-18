/**
 * Venue Approval Service
 *
 * Business logic for venue approval operations.
 * Uses the same hierarchy-based approval chain as events (buildApprovalChain(venue.creator_id)).
 */

import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as venueDAL from "@/lib/data-access/venues.dal";
import * as venueApprovalDAL from "@/lib/data-access/venue-approvals.dal";
import type { VenueApprovalWithApprover } from "@/lib/data-access/venue-approvals.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { createClient } from "@/lib/supabase/server";
import * as auditService from "@/lib/services/audit/audit.service";

/**
 * Get pending venue approvals for a user
 *
 * Global Directors see both pending and waiting for visibility.
 * All roles can only approve/reject when it is their turn (status = "pending"); pyramid is not bypassed.
 */
export async function getPendingVenueApprovals(
  userId: string,
  includeWaiting: boolean = false
): Promise<VenueApprovalWithApprover[]> {
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.from("users").select("role").eq("id", userId).single();

  if (userError || !user) {
    throw new NotFoundError("User", userId);
  }

  const role = (user as { role: string }).role;
  const isGlobalDirector = role === "global_director";
  const effectiveIncludeWaiting = includeWaiting || isGlobalDirector;

  return venueApprovalDAL.findPendingForUser(userId, true, effectiveIncludeWaiting);
}

/**
 * Approve a venue
 * - Marks current approval as approved
 * - If last in chain: sets venue approval_status to 'approved', is_active true
 * - Else: activates next approver
 * Pyramid is enforced for all roles; no bypass.
 */
export async function approveVenue(
  userId: string,
  venueId: string,
  comment: string
): Promise<{ venue: VenueWithCreator; isLast: boolean }> {
  const subordinateIds = await getSubordinateUserIds(userId);
  const supabase = await createClient();

  // Venue might be pending so we need to allow visibility for approvers: fetch by id without creator filter for approvers
  const venue = await venueDAL.findById(venueId, subordinateIds, true);
  if (!venue) {
    const { data: user } = await supabase.from("users").select("role").eq("id", userId).single();
    const isGD = (user as { role: string } | null)?.role === "global_director";
    const venueForGD = isGD ? await venueDAL.findById(venueId, null, true) : null;
    if (!venueForGD) {
      throw new NotFoundError("Venue", venueId);
    }
  }

  const resolvedVenue = venue ?? (await venueDAL.findById(venueId, null, true));
  if (!resolvedVenue) {
    throw new NotFoundError("Venue", venueId);
  }

  const approvals = await venueApprovalDAL.findByVenueId(venueId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this venue");
  }

  // Enforce pyramid: only the current approver (status = "pending") can approve. No bypass for any role.
  if (currentApproval.status === "waiting") {
    throw new ForbiddenError("It is not your turn to approve this venue");
  }

  await venueApprovalDAL.updateStatus(currentApproval.id, "approved", comment);

  const isLast = await venueApprovalDAL.isLastApprover(venueId, currentApproval.sequence_order);

  if (isLast) {
    await venueDAL.update(venueId, {
      approval_status: "approved",
      is_active: true,
    });

    await auditService.log("approve_venue", userId, null, {
      venue_id: venueId,
      venue_name: resolvedVenue.name,
      comment,
      final_approval: true,
    });
  } else {
    const nextApproverId = await venueApprovalDAL.getNextApprover(venueId, currentApproval.sequence_order);
    if (nextApproverId) {
      const nextApproval = approvals.find((a) => a.approver_id === nextApproverId);
      if (nextApproval) {
        await venueApprovalDAL.updateStatus(nextApproval.id, "pending", undefined);
      }
    }

    await auditService.log("approve_venue", userId, null, {
      venue_id: venueId,
      venue_name: resolvedVenue.name,
      comment,
      final_approval: false,
    });
  }

  const updated = await venueDAL.findById(venueId, null, true);
  if (!updated) {
    throw new NotFoundError("Venue", venueId);
  }

  return {
    venue: updated,
    isLast,
  };
}

/**
 * Reject a venue
 * - Marks current approval as rejected
 * - Sets venue approval_status to 'rejected'
 */
export async function rejectVenue(userId: string, venueId: string, comment: string): Promise<VenueWithCreator> {
  if (!comment || comment.trim().length === 0) {
    throw new ValidationError("Comment is required when rejecting a venue");
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  const supabase = await createClient();

  const venue = await venueDAL.findById(venueId, subordinateIds, true);
  if (!venue) {
    const { data: user } = await supabase.from("users").select("role").eq("id", userId).single();
    const isGD = (user as { role: string } | null)?.role === "global_director";
    const venueForGD = isGD ? await venueDAL.findById(venueId, null, true) : null;
    if (!venueForGD) {
      throw new NotFoundError("Venue", venueId);
    }
  }

  const resolvedVenue = venue ?? (await venueDAL.findById(venueId, null, true));
  if (!resolvedVenue) {
    throw new NotFoundError("Venue", venueId);
  }

  const approvals = await venueApprovalDAL.findByVenueId(venueId, false);
  const currentApproval = approvals.find(
    (a) => a.approver_id === userId && (a.status === "pending" || a.status === "waiting")
  );

  if (!currentApproval) {
    throw new ForbiddenError("You do not have a pending approval for this venue");
  }

  // Enforce pyramid: only the current approver (status = "pending") can reject. No bypass for any role.
  if (currentApproval.status === "waiting") {
    throw new ForbiddenError("It is not your turn to approve this venue");
  }

  await venueApprovalDAL.updateStatus(currentApproval.id, "rejected", comment);
  await venueDAL.update(venueId, { approval_status: "rejected" });

  await auditService.log("reject_venue", userId, null, {
    venue_id: venueId,
    venue_name: resolvedVenue.name,
    comment,
  });

  const updated = await venueDAL.findById(venueId, null, true);
  if (!updated) {
    throw new NotFoundError("Venue", venueId);
  }

  return updated;
}
