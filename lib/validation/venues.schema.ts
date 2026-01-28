/**
 * Venue Validation Schemas
 *
 * Zod schemas for venue creation and updates
 * Multi-step form validation
 */

import { z } from "zod";

// Constants for validation
export const MAX_TEXTAREA_LENGTH = 100000;

/**
 * Step 1: Basic Information Schema
 */
export const venueStep1Schema = z.object({
  name: z.string().min(1, "Venue name is required").max(200, "Venue name must be less than 200 characters").trim(),
  street: z
    .string()
    .min(1, "Street address is required")
    .max(500, "Street address must be less than 500 characters")
    .trim(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim(),
  state: z.string().max(100, "State must be less than 100 characters").trim().nullable().optional(),
  country: z.string().min(1, "Country is required").max(100, "Country must be less than 100 characters").trim(),
  country_id: z.string().uuid("Invalid country ID").nullable().optional(),
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
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
});

/**
 * Step 2: Capacity & Features Schema
 */
export const venueStep2Schema = z
  .object({
    capacity_standing: z
      .number()
      .int("Standing capacity must be a whole number")
      .min(0, "Standing capacity must be 0 or greater")
      .max(99999999, "Standing capacity must be less than 99,999,999")
      .nullable()
      .optional(),
    capacity_seated: z
      .number()
      .int("Seated capacity must be a whole number")
      .min(0, "Seated capacity must be 0 or greater")
      .max(99999999, "Seated capacity must be less than 99,999,999")
      .nullable()
      .optional(),
    available_rooms_halls: z
      .string()
      .max(MAX_TEXTAREA_LENGTH, `Description must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
      .nullable()
      .optional(),
    technical_specs: z
      .object({
        sound: z.boolean().optional(),
        lights: z.boolean().optional(),
        screens: z.boolean().optional(),
      })
      .nullable()
      .optional(),
    availability_start_date: z
      .string()
      .date("Invalid start date")
      // .refine((date) => {
      //   const startDate = new Date(date);
      //   const today = new Date();
      //   today.setHours(0, 0, 0, 0);
      //   return startDate >= today;
      // }, "Start date must be today or later")
      .nullable()
      .optional(),
    availability_end_date: z.string().date("Invalid end date").nullable().optional(),
    base_pricing: z
      .number()
      .nonnegative("Base pricing must be 0 or greater")
      .max(999999999.99, "Base pricing seems unreasonably large")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.availability_start_date && data.availability_end_date) {
        const start = new Date(data.availability_start_date);
        const end = new Date(data.availability_end_date);
        const maxEnd = new Date(start);
        maxEnd.setFullYear(maxEnd.getFullYear() + 1);
        return end <= maxEnd;
      }
      return true;
    },
    {
      message: "End date must be within 1 year from start date",
      path: ["availability_end_date"],
    }
  )
  .refine(
    (data) => {
      if (data.availability_start_date && data.availability_end_date) {
        const start = new Date(data.availability_start_date);
        const end = new Date(data.availability_end_date);
        return end >= start;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["availability_end_date"],
    }
  );

/**
 * Step 3: Contact & Media Schema
 */
export const venueStep3Schema = z.object({
  contact_person_name: z
    .string()
    .min(1, "Contact person name is required")
    .max(200, "Name must be less than 200 characters")
    .trim(),
  contact_email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .trim()
    .optional()
    .nullable(),
  contact_phone: z.string().max(50, "Phone number must be less than 50 characters").trim().optional().nullable(),
  restrictions: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Restrictions must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  images: z
    .array(z.string().url("Invalid image URL"))
    .max(5, "Maximum 5 images allowed")
    .min(0, "Images array cannot be negative")
    .default([]),
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
  state: z.string().max(100, "State must be less than 100 characters").trim().nullable().optional(),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters")
    .trim()
    .optional(),
  country_id: z.string().uuid("Invalid country ID").nullable().optional(),
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
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
  capacity_standing: z
    .number()
    .int("Standing capacity must be a whole number")
    .min(0, "Standing capacity must be 0 or greater")
    .max(99999999, "Standing capacity must be less than 99,999,999")
    .nullable()
    .optional(),
  capacity_seated: z
    .number()
    .int("Seated capacity must be a whole number")
    .min(0, "Seated capacity must be 0 or greater")
    .max(99999999, "Seated capacity must be less than 99,999,999")
    .nullable()
    .optional(),
  available_rooms_halls: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Description must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  technical_specs: z
    .object({
      sound: z.boolean().optional(),
      lights: z.boolean().optional(),
      screens: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  availability_start_date: z.string().date("Invalid start date").nullable().optional(),
  availability_end_date: z.string().date("Invalid end date").nullable().optional(),
  base_pricing: z
    .number()
    .nonnegative("Base pricing must be 0 or greater")
    .max(999999999.99, "Base pricing seems unreasonably large")
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
  contact_phone: z.string().max(50, "Phone number must be less than 50 characters").trim().optional().nullable(),
  restrictions: z
    .string()
    .max(MAX_TEXTAREA_LENGTH, `Restrictions must be less than ${MAX_TEXTAREA_LENGTH.toLocaleString()} characters`)
    .nullable()
    .optional(),
  images: z
    .array(z.string().url("Invalid image URL"))
    .max(5, "Maximum 5 images allowed")
    .min(0, "Images array cannot be negative")
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
