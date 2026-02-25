/**
 * Marketing Report Validation Schemas
 *
 * All fields required except notes.
 */

import { z } from "zod";

const marketingFileSchema = z.object({
  url: z.string().url("Invalid URL"),
  name: z.string().max(500).optional(),
});

export const submitMarketingReportSchema = z.object({
  notes: z.string().max(5000).optional().nullable(),
  marketing_flyers: z.array(marketingFileSchema).min(1, "At least one flyer is required"),
  marketing_videos: z.array(marketingFileSchema).min(1, "At least one video is required"),
  marketing_strategy_files: z.array(marketingFileSchema).min(1, "At least one marketing strategy file is required"),
  marketing_budget: z.number().positive("Budget must be greater than 0"),
});

export type SubmitMarketingReportInput = z.infer<typeof submitMarketingReportSchema>;
