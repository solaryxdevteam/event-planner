/**
 * Draft Service
 *
 * Business logic for event draft operations
 *
 * IMPORTANT: All authorization is handled via pyramid visibility.
 * Users can only see/modify drafts created by themselves or their subordinates.
 */

import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validation/events.schema";
import { createClient } from "@/lib/supabase/server";

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
 * Create a draft event
 * IMPORTANT: Each user can only have ONE draft at a time.
 * If a draft already exists, it will be deleted before creating a new one.
 */
export async function createDraft(userId: string, data: CreateEventInput): Promise<EventWithRelations> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Check if user already has a draft
  const existingDrafts = await eventDAL.findByCreator(userId, subordinateIds, "draft", false);

  // Delete all existing drafts (should only be one, but handle multiple just in case)
  for (const draft of existingDrafts) {
    if (draft.creator_id === userId && draft.status === "draft") {
      // Log audit trail for deletion BEFORE deleting (to avoid foreign key constraint)
      await auditService.log("delete_draft", userId, draft.id, {
        event_title: draft.title,
        reason: "Replaced by new draft",
      });
      // Delete after logging
      await eventDAL.deleteEvent(draft.id);
    }
  }

  // Generate short_id
  const shortId = await generateEventShortId();

  // Create the draft event
  const event = await eventDAL.insert({
    short_id: shortId,
    title: data.title,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    venue_id: data.venue_id || null,
    dj_id: data.dj_id || null,
    creator_id: userId,
    status: "draft",
    expected_attendance: data.expected_attendance || null,
    minimum_ticket_price: data.minimum_ticket_price ?? null,
    minimum_table_price: data.minimum_table_price ?? null,
    notes: data.notes || null,
    proposed_ticket_files: data.proposed_ticket_files ?? [],
    proposed_table_files: data.proposed_table_files ?? [],
  });

  // Log audit trail
  await auditService.log("create_draft", userId, event.id, {
    event_title: event.title,
  });

  // Fetch with relations
  const eventWithRelations = await eventDAL.findById(event.id, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", event.id);
  }

  return eventWithRelations;
}

/**
 * Create an event as approved (no approval chain).
 * Used when a Global Director creates an event after OTP verification.
 */
export async function createEventAsApprovedForGD(
  userId: string,
  data: CreateEventInput,
  verificationToken: string
): Promise<EventWithRelations> {
  await verificationOtpService.consumeVerificationToken(userId, "event_create", userId, "create", verificationToken);

  const subordinateIds = await getSubordinateUserIds(userId);

  // Remove any existing drafts so we don't leave orphans (same as createDraft)
  const existingDrafts = await eventDAL.findByCreator(userId, subordinateIds, "draft", false);
  for (const draft of existingDrafts) {
    if (draft.creator_id === userId && draft.status === "draft") {
      await auditService.log("delete_draft", userId, draft.id, {
        event_title: draft.title,
        reason: "Replaced by GD creating event as approved",
      });
      await eventDAL.deleteEvent(draft.id);
    }
  }

  const shortId = await generateEventShortId();

  const event = await eventDAL.insert({
    short_id: shortId,
    title: data.title,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    venue_id: data.venue_id || null,
    dj_id: data.dj_id || null,
    creator_id: userId,
    status: "approved_scheduled",
    expected_attendance: data.expected_attendance || null,
    minimum_ticket_price: data.minimum_ticket_price ?? null,
    minimum_table_price: data.minimum_table_price ?? null,
    notes: data.notes || null,
    proposed_ticket_files: data.proposed_ticket_files ?? [],
    proposed_table_files: data.proposed_table_files ?? [],
  });

  await auditService.log("create_event_as_approved", userId, event.id, {
    event_title: event.title,
    reason: "Global Director created event (OTP verified)",
  });

  const eventWithRelations = await eventDAL.findById(event.id, subordinateIds, true);
  if (!eventWithRelations) {
    throw new NotFoundError("Event", event.id);
  }
  return eventWithRelations;
}

/**
 * Update a draft event (auto-save)
 */
export async function updateDraft(
  userId: string,
  eventId: string,
  data: UpdateEventInput
): Promise<EventWithRelations> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the existing event (with authorization check)
  const existingEvent = await eventDAL.findById(eventId, subordinateIds, false);
  if (!existingEvent) {
    throw new NotFoundError("Event", eventId);
  }

  // Check ownership: only the creator can update drafts
  if (existingEvent.creator_id !== userId) {
    throw new ForbiddenError("You can only update your own drafts");
  }

  // Check that it's a draft
  if (existingEvent.status !== "draft") {
    throw new ForbiddenError("Only draft events can be updated");
  }

  // Update the event
  const updatedEvent = await eventDAL.update(eventId, {
    title: data.title,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    venue_id: data.venue_id,
    dj_id: data.dj_id,
    expected_attendance: data.expected_attendance,
    minimum_ticket_price: data.minimum_ticket_price,
    minimum_table_price: data.minimum_table_price,
    notes: data.notes,
    proposed_ticket_files: data.proposed_ticket_files,
    proposed_table_files: data.proposed_table_files,
  });

  // Log audit trail
  await auditService.log("update_event", userId, eventId, {
    event_title: updatedEvent.title,
    old_data: existingEvent,
    new_data: updatedEvent,
  });

  // Fetch with relations
  const eventWithRelations = await eventDAL.findById(eventId, subordinateIds, true);

  if (!eventWithRelations) {
    throw new NotFoundError("Event", eventId);
  }

  return eventWithRelations;
}

/**
 * Delete a draft event (hard delete)
 */
export async function deleteDraft(userId: string, eventId: string): Promise<void> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get the existing event (with authorization check)
  const event = await eventDAL.findById(eventId, subordinateIds, false);
  if (!event) {
    throw new NotFoundError("Event", eventId);
  }

  // Check ownership: only the creator can delete drafts
  if (event.creator_id !== userId) {
    throw new ForbiddenError("You can only delete your own drafts");
  }

  // Check that it's a draft
  if (event.status !== "draft") {
    throw new ForbiddenError("Only draft events can be deleted");
  }

  // Log audit trail BEFORE deleting (to avoid foreign key constraint)
  await auditService.log("delete_draft", userId, eventId, {
    event_title: event.title,
  });

  // Hard delete
  await eventDAL.deleteEvent(eventId);
}

/**
 * Get all drafts for a user
 * Note: Users should only have one draft, but this returns all for safety
 */
export async function getDrafts(userId: string): Promise<EventWithRelations[]> {
  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Get drafts created by the user
  return eventDAL.findByCreator(userId, subordinateIds, "draft", true);
}

/**
 * Get the first (and should be only) draft for a user
 * Returns null if no draft exists
 */
export async function getFirstDraft(userId: string): Promise<EventWithRelations | null> {
  const drafts = await getDrafts(userId);
  return drafts.length > 0 ? drafts[0] : null;
}

/**
 * Check if user has an existing draft
 */
export async function hasDraft(userId: string): Promise<boolean> {
  const drafts = await getDrafts(userId);
  return drafts.length > 0;
}
