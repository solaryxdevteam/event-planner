/**
 * Event Service
 *
 * Business logic for event operations including submission for approval
 *
 * IMPORTANT: All authorization is handled via pyramid visibility.
 * Users can only see/modify events created by themselves or their subordinates.
 * Approval chain is automatically built based on the organizational hierarchy.
 */

import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/utils/errors";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";
import * as eventVersionDAL from "@/lib/data-access/event-versions.dal";
import type { EventVersionInsert } from "@/lib/data-access/event-versions.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import { buildApprovalChain } from "@/lib/services/approvals/chain-builder.service";
import type { EventWithRelations, EventFilterOptions } from "@/lib/data-access/events.dal";
import type { CreateEventInput } from "@/lib/validation/events.schema";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types/roles";

const MARKETING_ASSETS_STATUSES = ["approved_scheduled", "completed_awaiting_report", "completed_archived"];

export interface UpdateEventMarketingAssetsInput {
  marketing_flyers?: { url: string; name?: string }[];
  marketing_videos?: { url: string; name?: string }[];
  marketing_budget?: number | null;
}

/**
 * Update event marketing assets (flyers, videos, budget). Only marketing_manager, only for approved/past events.
 */
export async function updateEventMarketingAssets(
  userId: string,
  eventId: string,
  data: UpdateEventMarketingAssetsInput
): Promise<EventWithRelations> {
  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).single();
  const role = (userRow as { role?: string } | null)?.role;

  if (role !== "marketing_manager") {
    throw new ForbiddenError("Only Marketing Managers can update event marketing assets");
  }

  const event = await eventDAL.findByIdForMarketing(eventId);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  if (!MARKETING_ASSETS_STATUSES.includes(event.status)) {
    throw new ForbiddenError("Marketing assets can only be updated for approved or past events");
  }

  const updates: Parameters<typeof eventDAL.update>[1] = {};
  if (data.marketing_flyers !== undefined) updates.marketing_flyers = data.marketing_flyers;
  if (data.marketing_videos !== undefined) updates.marketing_videos = data.marketing_videos;
  if (data.marketing_budget !== undefined) updates.marketing_budget = data.marketing_budget;

  await eventDAL.update(eventId, updates);

  const updated = await eventDAL.findByIdForMarketing(eventId);
  if (!updated) {
    throw new NotFoundError("Event", eventId);
  }
  return updated;
}

/**
 * Generate unique short_id for events
 */
async function generateEventShortId(): Promise<string> {
  const supabase = await createClient();
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 90000 + 10000);
    const shortId = `EVT-${randomNum}`;

    // Check if this short_id already exists
    const { data } = await supabase.from("events").select("short_id").eq("short_id", shortId).maybeSingle();

    // If no data found, the short_id is available
    if (!data) {
      return shortId;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique event short_id after maximum attempts");
}

/**
 * Get a single event by ID with permission check.
 * Marketing managers can view any event with status approved_scheduled or completed_*.
 */
export async function getEventById(userId: string, eventId: string): Promise<EventWithRelations> {
  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).single();
  const role = (userRow as { role?: string } | null)?.role;

  if (role === "marketing_manager") {
    const event = await eventDAL.findByIdForMarketing(eventId);
    if (!event) {
      throw new NotFoundError("Event", eventId);
    }
    return event;
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  const event = await eventDAL.findById(eventId, subordinateIds, true);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }
  return event;
}

/**
 * Get a single event by short_id with permission check.
 * Marketing managers can view any event with status approved_scheduled or completed_*.
 */
export async function getEventByShortId(userId: string, shortId: string): Promise<EventWithRelations> {
  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).single();
  const role = (userRow as { role?: string } | null)?.role;

  if (role === "marketing_manager") {
    const event = await eventDAL.findByShortIdForMarketing(shortId);
    if (!event) {
      throw new NotFoundError("Event", shortId);
    }
    return event;
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  const event = await eventDAL.findByShortId(shortId, subordinateIds, true);
  if (!event) {
    throw new NotFoundError("Event", shortId);
  }
  return event;
}

/** Statuses that marketing_manager can see (approved + past only) */
const MARKETING_MANAGER_EVENT_STATUSES = [
  "approved_scheduled",
  "completed_awaiting_report",
  "completed_archived",
] as const;

/**
 * Get events visible to user with filters (pyramid visibility).
 * Marketing managers see only approved and past events (no draft/in_review/rejected/cancelled).
 */
export async function getEventsForUser(
  userId: string,
  filters: EventFilterOptions = {}
): Promise<EventWithRelations[]> {
  const supabase = await createClient();
  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).single();

  const role = (userRow as { role?: string } | null)?.role;

  if (role === "marketing_manager") {
    const allowed = [...MARKETING_MANAGER_EVENT_STATUSES];
    const requested = filters.status ? (Array.isArray(filters.status) ? filters.status : [filters.status]) : allowed;
    const statusFilter = requested.filter((s) => allowed.includes(s as (typeof allowed)[number]));
    return eventDAL.findAllByStatuses(statusFilter.length ? statusFilter : allowed, {
      ...filters,
      status: undefined,
      includeRelations: true,
    });
  }

  const subordinateIds = await getSubordinateUserIds(userId);
  return eventDAL.findPyramidVisible(subordinateIds, {
    ...filters,
    includeRelations: true,
  });
}

/**
 * Submit event for approval
 * - Validates event is complete
 * - Builds approval chain
 * - Updates status to in_review
 * - Creates approval records
 * - Notifies first approver (stub for now)
 * - Logs audit
 */
export async function submitForApproval(userId: string, eventId: string): Promise<EventWithRelations> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the existing event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Check ownership: only the creator can submit
  if (event.creator_id !== userId) {
    throw new ForbiddenError("You can only submit your own events");
  }

  // Check that it's a draft
  if (event.status !== "draft") {
    throw new ForbiddenError("Only draft events can be submitted for approval");
  }

  // Validate event is complete
  if (!event.title || !event.starts_at) {
    throw new ValidationError("Event must have a title and start date/time");
  }

  // Build approval chain
  const approverIds = await buildApprovalChain(userId);

  if (approverIds.length === 0) {
    throw new ValidationError(
      "No approvers found in the approval chain. This can happen if:\n" +
        "1. You are not assigned to a parent in the hierarchy (please contact admin)\n" +
        "2. You are at the top of the hierarchy with no one to approve\n" +
        "3. The approval configuration has all roles disabled\n\n" +
        "Please contact your system administrator to resolve this issue."
    );
  }

  // Update event status to in_review
  await eventDAL.update(eventId, {
    status: "in_review",
  });

  // Create approval chain
  await approvalDAL.createChain(eventId, approverIds, "event");

  // Notify for last approver (global director)
  // await emailService.sendApprovalNotification(approverIds[0], eventId, "event");

  // Log audit trail
  await auditService.log("submit_for_approval", userId, eventId, {
    event_title: event.title,
    approver_count: approverIds.length,
  });

  // Fetch with relations
  const eventWithRelations = await eventDAL.findById(eventId, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", eventId);
  }

  return eventWithRelations;
}

/**
 * Create a new draft from a rejected event
 */
export async function createFromRejected(userId: string, rejectedEventId: string): Promise<EventWithRelations> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the rejected event (with authorization check)
  const rejectedEvent = await eventDAL.findById(rejectedEventId, subordinateIds, false);
  if (!rejectedEvent) {
    throw new NotFoundError("Event", rejectedEventId);
  }

  // Check ownership: only the creator can create from rejected
  if (rejectedEvent.creator_id !== userId) {
    throw new ForbiddenError("You can only create drafts from your own rejected events");
  }

  // Check that it's rejected
  if (rejectedEvent.status !== "rejected") {
    throw new ForbiddenError("Only rejected events can be used to create new drafts");
  }

  // IMPORTANT: Delete any existing draft before creating new one (one draft per user)
  const existingDrafts = await eventDAL.findByCreator(userId, subordinateIds, "draft", false);
  for (const draft of existingDrafts) {
    if (draft.creator_id === userId && draft.status === "draft") {
      await eventDAL.deleteEvent(draft.id);
      // Log audit trail for deletion
      await auditService.log("delete_draft", userId, draft.id, {
        event_title: draft.title,
        reason: "Replaced by draft from rejected event",
      });
    }
  }

  // Generate short_id for new draft
  const shortId = await generateEventShortId();

  // Create new draft with same data
  const newDraft = await eventDAL.insert({
    short_id: shortId,
    title: rejectedEvent.title,
    starts_at: rejectedEvent.starts_at,
    venue_id: rejectedEvent.venue_id,
    dj_id: rejectedEvent.dj_id ?? null,
    creator_id: userId,
    status: "draft",
    expected_attendance: rejectedEvent.expected_attendance,
    minimum_ticket_price: rejectedEvent.minimum_ticket_price ?? null,
    minimum_table_price: rejectedEvent.minimum_table_price ?? null,
    notes: rejectedEvent.notes,
  });

  // Log audit trail
  await auditService.log("create_draft", userId, newDraft.id, {
    event_title: newDraft.title,
    created_from_rejected: rejectedEventId,
  });

  // Fetch with relations
  const eventWithRelations = await eventDAL.findById(newDraft.id, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", newDraft.id);
  }

  return eventWithRelations;
}

/**
 * Request modification for an approved event
 * - Only Event Planner can request modification
 * - Only approved_scheduled events can be modified
 * - Creates a new event version with status "in_review"
 * - Original event stays active with "Modification pending" badge
 * - Builds approval chain for modification
 * - Logs audit
 */
export async function requestModification(
  userId: string,
  eventId: string,
  modificationData: CreateEventInput,
  changeReason?: string
): Promise<EventWithRelations> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the existing event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Check ownership: only the creator can request modification
  if (event.creator_id !== userId) {
    throw new ForbiddenError("You can only request modification for your own events");
  }

  // Check user role: only Event Planner can request modification
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.from("users").select("role").eq("id", userId).single();

  if (userError || !user) {
    throw new NotFoundError("User", userId);
  }

  const typedUser = user as { role: UserRole };

  if (typedUser.role !== UserRole.EVENT_PLANNER) {
    throw new ForbiddenError("Only Event Planners can request modifications");
  }

  // Check that event is approved_scheduled (only after Global approval)
  if (event.status !== "approved_scheduled") {
    throw new ForbiddenError("Only approved events can be modified");
  }

  // Check if there's already a pending modification
  const existingPendingVersion = await eventVersionDAL.findPendingVersion(eventId);
  if (existingPendingVersion) {
    throw new ForbiddenError("A modification request is already pending for this event");
  }

  // Validate modification data
  if (!modificationData.title || !modificationData.starts_at) {
    throw new ValidationError("Modification must include title and start date/time");
  }

  // Build approval chain for modification (same as original event)
  const approverIds = await buildApprovalChain(userId);

  if (approverIds.length === 0) {
    throw new ValidationError("No approvers found in the approval chain. Please contact your system administrator.");
  }

  // Delete any existing modification approval chains before creating a new one
  // This handles the case where a previous modification was rejected and the approval chain still exists
  await approvalDAL.deleteByEventIdAndType(eventId, "modification");

  // Create event version with modification data
  const versionData = {
    event_id: eventId,
    version_data: {
      title: modificationData.title,
      starts_at: modificationData.starts_at,
      venue_id: modificationData.venue_id || null,
      dj_id: modificationData.dj_id ?? null,
      expected_attendance: modificationData.expected_attendance || null,
      minimum_ticket_price: modificationData.minimum_ticket_price ?? null,
      minimum_table_price: modificationData.minimum_table_price ?? null,
      notes: modificationData.notes || null,
    },
    status: "in_review" as const,
    change_reason: changeReason || null,
  };

  // Cast through unknown because Supabase's generated insert type expects fields
  // like version_number which are populated inside the DAL.
  const eventVersion = await eventVersionDAL.insert(versionData as unknown as EventVersionInsert);

  // Create approval chain for modification
  await approvalDAL.createChain(eventId, approverIds, "modification");

  // Log audit trail
  await auditService.log("request_modification", userId, eventId, {
    event_title: event.title,
    version_id: eventVersion.id,
    change_reason: changeReason,
    approver_count: approverIds.length,
  });

  // Fetch updated event with relations
  const eventWithRelations = await eventDAL.findById(eventId, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", eventId);
  }

  return eventWithRelations;
}
