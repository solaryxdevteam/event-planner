/**
 * Cancellation Validation Schemas
 *
 * Zod schemas for cancellation-related operations
 */

import { z } from "zod";

/**
 * Request cancellation schema
 */
export const requestCancellationSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  reason: z.string().min(1, "Cancellation reason is required").max(1000, "Reason must be less than 1000 characters"),
});

// TypeScript types exported from schemas
export type RequestCancellationInput = z.infer<typeof requestCancellationSchema>;
