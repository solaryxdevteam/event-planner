/**
 * Venue Validation Schemas
 *
 * Zod schemas for venue creation and updates
 * Multi-step form validation
 */

import { z } from "zod";

// Constants for validation
export const MAX_TEXTAREA_LENGTH = 100000;
export const MAX_MEDIA_ITEMS = 10;
export const MAX_FLOOR_PLANS = 20;

const venueMediaItemSchema = z.object({
  url: z.string().url("Invalid media URL"),
  type: z.enum(["photo", "video"]),
  isCover: z.boolean().optional(),
});

/** Floor plan item: URL and optional original file name for display */
export const floorPlanItemSchema = z.object({
  url: z.string().url("Invalid file URL"),
  name: z.string().max(255, "File name too long").optional(),
});

/**
 * Step 1: Basic Information Schema
 * Country is selectable (any country); state field removed
 */
export const venueStep1Schema = z.object({
  name: z.string().min(1, "Venue name is required").max(200, "Venue name must be less than 200 characters").trim(),
  street: z
    .string()
    .min(1, "Street address is required")
    .max(500, "Street address must be less than 500 characters")
    .trim(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim(),
  country: z.string().min(1, "Country is required").max(100, "Country must be less than 100 characters").trim(),
  country_id: z.string().uuid("Invalid country ID").nullable().optional(),
  location_lat: z
    .number({ message: "Map location is required" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  location_lng: z
    .number({ message: "Map location is required" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

/**
 * Step 2: Capacity & Features Schema
 * total_capacity, number_of_tables, ticket_capacity, sounds, lights, screens
 */
export const venueStep2Schema = z.object({
  total_capacity: z
    .number({ message: "Total capacity is required" })
    .int("Total capacity must be a whole number")
    .min(0, "Total capacity must be 0 or greater")
    .max(99999999, "Total capacity must be less than 99,999,999"),
  number_of_tables: z
    .number({ message: "Number of tables is required" })
    .int("Number of tables must be a whole number")
    .min(0, "Number of tables must be 0 or greater")
    .max(99999999, "Number of tables must be less than 99,999,999"),
  ticket_capacity: z
    .number({ message: "Ticket capacity is required" })
    .int("Ticket capacity must be a whole number")
    .min(0, "Ticket capacity must be 0 or greater")
    .max(99999999, "Ticket capacity must be less than 99,999,999"),
  sounds: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  lights: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  screens: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
});

/**
 * Step 3: Contact & Media Schema
 * Contact email with verification; floor_plans; media (photos/videos, max 10, cover selectable)
 */
export const venueStep3Schema = z.object({
  contact_person_name: z
    .string()
    .min(1, "Contact person name is required")
    .max(200, "Name must be less than 200 characters")
    .trim(),
  contact_email: z
    .string()
    .min(1, "Venue contact email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .trim(),
  floor_plans: z
    .array(floorPlanItemSchema)
    .min(1, "At least one floor plan is required")
    .max(MAX_FLOOR_PLANS, `Maximum ${MAX_FLOOR_PLANS} floor plan files allowed`),
  media: z
    .array(venueMediaItemSchema)
    .min(1, "At least one photo or video is required")
    .max(MAX_MEDIA_ITEMS, `Maximum ${MAX_MEDIA_ITEMS} photos/videos allowed`)
    .refine((arr) => arr.some((m) => m.isCover === true), {
      message: "Please select one image as the cover image",
    }),
});

/**
 * Combined schema for creating a new venue
 */
export const createVenueSchema = venueStep1Schema.merge(venueStep2Schema).merge(venueStep3Schema);

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
  street: z
    .string()
    .min(1, "Street address is required")
    .max(500, "Street address must be less than 500 characters")
    .trim()
    .optional(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim().optional(),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters")
    .trim()
    .optional(),
  country_id: z.string().uuid("Invalid country ID").nullable().optional(),
  location_lat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .nullable()
    .optional(),
  location_lng: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .nullable()
    .optional(),
  total_capacity: z
    .number()
    .int("Total capacity must be a whole number")
    .min(0, "Total capacity must be 0 or greater")
    .max(99999999, "Total capacity must be less than 99,999,999")
    .nullable()
    .optional(),
  number_of_tables: z
    .number()
    .int("Number of tables must be a whole number")
    .min(0, "Number of tables must be 0 or greater")
    .max(99999999, "Number of tables must be less than 99,999,999")
    .nullable()
    .optional(),
  ticket_capacity: z
    .number()
    .int("Ticket capacity must be a whole number")
    .min(0, "Ticket capacity must be 0 or greater")
    .max(99999999, "Ticket capacity must be less than 99,999,999")
    .nullable()
    .optional(),
  sounds: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  lights: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  screens: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  contact_person_name: z
    .string()
    .min(1, "Contact person name is required")
    .max(200, "Name must be less than 200 characters")
    .trim()
    .optional(),
  contact_email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .trim()
    .optional()
    .nullable(),
  floor_plans: z
    .array(floorPlanItemSchema)
    .max(MAX_FLOOR_PLANS, `Maximum ${MAX_FLOOR_PLANS} floor plan files allowed`)
    .optional(),
  media: z
    .array(venueMediaItemSchema)
    .max(MAX_MEDIA_ITEMS, `Maximum ${MAX_MEDIA_ITEMS} photos/videos allowed`)
    .refine((arr) => !arr || arr.length === 0 || arr.some((m) => m.isCover === true), {
      message: "Please select one image as the cover image",
    })
    .optional(),
});

/**
 * Type exports for use in other files
 */
export type VenueStep1Input = z.infer<typeof venueStep1Schema>;
export type VenueStep2Input = z.infer<typeof venueStep2Schema>;
export type VenueStep3Input = z.infer<typeof venueStep3Schema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type VenueMediaItemInput = z.infer<typeof venueMediaItemSchema>;
export type FloorPlanItemInput = z.infer<typeof floorPlanItemSchema>;
