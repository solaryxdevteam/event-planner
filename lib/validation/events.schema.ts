/**
 * Event Validation Schemas
 *
 * Zod schemas for event-related operations
 */

import { z } from "zod";

/**
 * Base event object schema (no refinements).
 * All fields nullable/optional except title; notes is optional.
 */
const baseEventObjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  starts_at: z.string().datetime("Starts at must be a valid datetime").nullable(),
  ends_at: z.string().datetime("Ends at must be a valid datetime").nullable(),
  venue_id: z.string().uuid("Invalid venue ID").nullable(),
  dj_id: z.string().uuid("Invalid DJ ID").nullable(),
  expected_attendance: z
    .number()
    .int("Expected attendance must be a whole number")
    .positive("Expected attendance must be a positive number")
    .nullable(),
  minimum_ticket_price: z.number().nonnegative("Minimum ticket price must be 0 or greater").nullable(),
  minimum_table_price: z.number().nonnegative("Minimum table price must be 0 or greater").nullable(),
  notes: z.string().max(5000, "Notes must be less than 5000 characters").optional().nullable(),
  proposed_ticket_files: z.array(z.object({ url: z.string().url(), name: z.string().optional() })),
  proposed_table_files: z.array(z.object({ url: z.string().url(), name: z.string().optional() })),
});

/** Create event schema – all required except notes. */
export const createEventSchema = baseEventObjectSchema
  .refine((d) => d.starts_at != null && d.starts_at !== "", { message: "Starts at is required", path: ["starts_at"] })
  .refine((d) => d.ends_at != null && d.ends_at !== "", { message: "Ends at is required", path: ["ends_at"] })
  .refine((d) => d.venue_id != null && d.venue_id !== "", { message: "Venue is required", path: ["venue_id"] })
  .refine((d) => d.dj_id != null && d.dj_id !== "", { message: "Please select a DJ for the event", path: ["dj_id"] })
  .refine((d) => d.expected_attendance != null, {
    message: "Expected attendance is required",
    path: ["expected_attendance"],
  })
  .refine((d) => d.minimum_ticket_price != null, {
    message: "Minimum ticket price is required",
    path: ["minimum_ticket_price"],
  })
  .refine((d) => d.minimum_table_price != null, {
    message: "Minimum table price is required",
    path: ["minimum_table_price"],
  })
  .refine((d) => Array.isArray(d.proposed_ticket_files) && d.proposed_ticket_files.length > 0, {
    message: "At least one proposed ticket file is required",
    path: ["proposed_ticket_files"],
  })
  .refine((d) => Array.isArray(d.proposed_table_files) && d.proposed_table_files.length > 0, {
    message: "At least one proposed table file is required",
    path: ["proposed_table_files"],
  })
  .refine(
    (d) => {
      if (!d.starts_at || !d.ends_at) return true;
      return new Date(d.ends_at) > new Date(d.starts_at);
    },
    { message: "End date must be after start date", path: ["ends_at"] }
  );

/** Update event schema (partial updates allowed). */
export const updateEventSchema = baseEventObjectSchema.partial();

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
