/**
 * Venue Validation Schemas
 *
 * Zod schemas for venue creation and updates
 */

import { z } from "zod";

/**
 * Schema for creating a new venue
 */
export const createVenueSchema = z.object({
  name: z.string().min(1, "Venue name is required").max(200, "Venue name must be less than 200 characters").trim(),
  address: z.string().min(1, "Address is required").max(500, "Address must be less than 500 characters").trim(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim(),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .positive("Capacity must be greater than 0")
    .max(1000000, "Capacity seems unreasonably large")
    .nullable()
    .optional(),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").nullable().optional(),
});

/**
 * Schema for updating an existing venue
 * All fields are optional for partial updates
 */
export const updateVenueSchema = z.object({
  name: z
    .string()
    .min(1, "Venue name is required")
    .max(200, "Venue name must be less than 200 characters")
    .trim()
    .optional(),
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address must be less than 500 characters")
    .trim()
    .optional(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim().optional(),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .positive("Capacity must be greater than 0")
    .max(1000000, "Capacity seems unreasonably large")
    .nullable()
    .optional(),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").nullable().optional(),
});

/**
 * Type exports for use in other files
 */
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
