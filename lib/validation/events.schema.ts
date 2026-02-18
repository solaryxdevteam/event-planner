/**
 * Event Validation Schemas
 *
 * Zod schemas for event-related operations
 */

import { z } from "zod";

/**
 * Base event schema (without refinements)
 * Used as base for both create and update schemas
 */
const baseEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  starts_at: z.string().datetime("Starts at must be a valid datetime").optional().nullable(),
  venue_id: z.string().uuid("Invalid venue ID").optional().nullable(),
  dj_id: z.string().uuid("Invalid DJ ID").optional().nullable(),
  expected_attendance: z
    .number()
    .int("Expected attendance must be a whole number")
    .positive("Expected attendance must be a positive number")
    .optional()
    .nullable(),
  minimum_ticket_price: z.number().nonnegative("Minimum ticket price must be 0 or greater").optional().nullable(),
  minimum_table_price: z.number().nonnegative("Minimum table price must be 0 or greater").optional().nullable(),
  notes: z.string().max(5000, "Notes must be less than 5000 characters").optional().nullable(),
});

/** Create event schema (no ends_at; transition to past 5h after start via cron). DJ is required. */
export const createEventSchema = baseEventSchema.refine((d) => d.dj_id != null && d.dj_id !== "", {
  message: "Please select a DJ for the event",
  path: ["dj_id"],
});

/** Update event schema (partial updates allowed). */
export const updateEventSchema = baseEventSchema.partial();

/**
 * Submit event for approval schema
 */
export const submitEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

/**
 * Approve event schema
 */
export const approveEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  comment: z.string().max(1000, "Comment must be less than 1000 characters").optional().nullable(),
});

/**
 * Reject event schema
 */
export const rejectEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  comment: z
    .string()
    .min(1, "Comment is required when rejecting")
    .max(1000, "Comment must be less than 1000 characters"),
});

/**
 * Create from rejected event schema
 */
export const createFromRejectedSchema = z.object({
  rejectedEventId: z.string().uuid("Invalid event ID"),
});

// TypeScript types exported from schemas
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type SubmitEventInput = z.infer<typeof submitEventSchema>;
export type ApproveEventInput = z.infer<typeof approveEventSchema>;
export type RejectEventInput = z.infer<typeof rejectEventSchema>;
export type CreateFromRejectedInput = z.infer<typeof createFromRejectedSchema>;
