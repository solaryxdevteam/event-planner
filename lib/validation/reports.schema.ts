/**
 * Report Validation Schemas
 *
 * Zod schemas for report-related operations
 */

import { z } from "zod";

/**
 * External link schema
 */
const externalLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
});

/**
 * Submit report schema
 */
export const submitReportSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  attendance_count: z
    .number()
    .int("Attendance count must be a whole number")
    .nonnegative("Attendance count must be 0 or greater"),
  summary: z
    .string()
    .min(20, "Summary must be at least 20 characters")
    .max(1000, "Summary must be less than 1000 characters"),
  feedback: z.string().max(2000, "Feedback must be less than 2000 characters").optional().nullable(),
  external_links: z.array(externalLinkSchema).optional().nullable(),
});

/**
 * Update report schema (for resubmission)
 */
export const updateReportSchema = z.object({
  reportId: z.string().uuid("Invalid report ID"),
  attendance_count: z
    .number()
    .int("Attendance count must be a whole number")
    .nonnegative("Attendance count must be 0 or greater"),
  summary: z
    .string()
    .min(20, "Summary must be at least 20 characters")
    .max(1000, "Summary must be less than 1000 characters"),
  feedback: z.string().max(2000, "Feedback must be less than 2000 characters").optional().nullable(),
  external_links: z.array(externalLinkSchema).optional().nullable(),
});

// TypeScript types exported from schemas
export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
