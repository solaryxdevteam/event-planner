/**
 * DJ Validation Schemas
 */

import { z } from "zod";

const MAX_TEXT_LENGTH = 2000;

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((s) => (!s || s === "" ? null : s));

const riderFileSchema = z.object({
  url: z.string().url(),
  type: z.enum(["photo", "video", "file"]),
});

const riderArraySchema = z.array(riderFileSchema).default([]);

export const createDjSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters").trim(),
  picture_url: optionalUrl,
  music_style: z.string().max(MAX_TEXT_LENGTH).optional().nullable(),
  price: z.number().min(0, "Price must be 0 or greater").max(99999999.99).optional().nullable(),
  email: z.string().email("Invalid email").max(255).trim(),
  technical_rider: riderArraySchema.optional(),
  hospitality_rider: riderArraySchema.optional(),
});

export const updateDjSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  picture_url: optionalUrl,
  music_style: z.string().max(MAX_TEXT_LENGTH).optional().nullable(),
  price: z.number().min(0).max(99999999.99).optional().nullable(),
  email: z.string().email().max(255).trim().optional(),
  technical_rider: riderArraySchema.optional(),
  hospitality_rider: riderArraySchema.optional(),
});

export type CreateDjInput = z.infer<typeof createDjSchema>;
export type UpdateDjInput = z.infer<typeof updateDjSchema>;
