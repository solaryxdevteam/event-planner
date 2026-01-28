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
  description: z.string().max(5000, "Description must be less than 5000 characters").optional().nullable(),
  starts_at: z.string().datetime("Starts at must be a valid datetime").optional().nullable(),
  ends_at: z.string().datetime("Ends at must be a valid datetime").optional().nullable(),
  venue_id: z.string().uuid("Invalid venue ID").optional().nullable(),
  expected_attendance: z
    .number()
    .int("Expected attendance must be a whole number")
    .positive("Expected attendance must be a positive number")
    .optional()
    .nullable(),
  budget_amount: z.number().nonnegative("Budget amount must be 0 or greater").optional().nullable(),
  budget_currency: z.string().length(3, "Currency must be a 3-letter code").optional().nullable(),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional().nullable(),
});

/**
 * Create event schema
 * Used for creating new draft events
 * Includes validation that ends_at must be after starts_at
 */
export const createEventSchema = baseEventSchema.refine(
  (data) => {
    // If both starts_at and ends_at are provided, ends_at must be after starts_at
    if (data.starts_at && data.ends_at) {
      return new Date(data.ends_at) > new Date(data.starts_at);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["ends_at"],
  }
);

/**
 * Update event schema
 * Used for updating draft events (partial updates allowed)
 * Also includes validation that ends_at must be after starts_at when both are provided
 */
export const updateEventSchema = baseEventSchema.partial().refine(
  (data) => {
    // If both starts_at and ends_at are provided, ends_at must be after starts_at
    if (data.starts_at && data.ends_at) {
      return new Date(data.ends_at) > new Date(data.starts_at);
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["ends_at"],
  }
);

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
