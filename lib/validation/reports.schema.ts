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
    .int("Total number of attendance must be a whole number")
    .nonnegative("Total number of attendance must be 0 or greater"),
  total_ticket_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  total_bar_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  total_table_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  detailed_report: z
    .string()
    .min(20, "Detailed event report must be at least 20 characters")
    .max(10000, "Detailed event report must be less than 10000 characters"),
  incidents: z.string().max(2000, "Incidents must be less than 2000 characters").optional().nullable(),
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
  total_ticket_sales: z.number().nonnegative().optional().nullable(),
  total_bar_sales: z.number().nonnegative().optional().nullable(),
  total_table_sales: z.number().nonnegative().optional().nullable(),
  detailed_report: z.string().min(20).max(10000).optional(),
  incidents: z.string().max(2000).optional().nullable(),
  feedback: z.string().max(2000).optional().nullable(),
  external_links: z.array(externalLinkSchema).optional().nullable(),
});

// TypeScript types exported from schemas
export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
