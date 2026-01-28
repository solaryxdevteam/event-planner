/**
 * User Validation Schemas
 *
 * Zod schemas for user-related operations
 */

import { z } from "zod";

/**
 * Valid user roles in the hierarchy
 */
export const roleEnum = z.enum([
  "event_planner",
  "city_curator",
  "regional_curator",
  "lead_curator",
  "global_director",
]);

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  first_name: z.string().min(1, "First name is required").max(100, "First name is too long"),
  last_name: z.string().max(100, "Last name is too long").nullable().optional(),
  role: roleEnum,
  parent_id: z.string().uuid("Invalid parent ID").nullable().optional(),
  country_id: z.string().uuid("Invalid country ID").optional(), // Defaults to US in database
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
  city: z.string().max(200, "City name is too long").nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)")
    .nullable()
    .optional(),
  company: z.string().max(200, "Company name is too long").nullable().optional(),
});

/**
 * Schema for updating an existing user (all fields optional except which ones are being updated)
 */
export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  first_name: z.string().min(1, "First name is required").max(100, "First name is too long").optional(),
  last_name: z.string().max(100, "Last name is too long").nullable().optional(),
  role: roleEnum.optional(),
  parent_id: z.string().uuid("Invalid parent ID").nullable().optional(),
  country_id: z.string().uuid("Invalid country ID").optional(),
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
  city: z.string().max(200, "City name is too long").nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)")
    .nullable()
    .optional(),
  company: z.string().max(200, "Company name is too long").nullable().optional(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || val.length >= 8, "Password must be at least 8 characters")
    .transform((val) => (val && val.trim() !== "" ? val : undefined)),
  status: z.enum(["pending", "active", "inactive"]).optional(),
  is_active: z.boolean().optional(),
  avatar_url: z.string().url("Invalid avatar URL").nullable().optional(),
  notification_prefs: z
    .object({
      email: z.boolean(),
      frequency: z.enum(["instant", "daily", "weekly"]),
    })
    .optional(),
});

/**
 * Schema for deactivating a user
 */
export const deactivateUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

/**
 * Schema for Global Director password confirmation
 */
export const globalDirectorPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/**
 * Schema for registering with an invitation
 */
export const registerWithInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  first_name: z.string().min(1, "First name is required").max(100, "First name is too long"),
  last_name: z.string().max(100, "Last name is too long").nullable().optional(),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^\+?[1-9]\d{1,14}$/.test(val),
      "Phone number must be in E.164 format (e.g., +1234567890)"
    )
    .transform((val) => (val && val.trim() !== "" ? val : null))
    .nullable(),
  company: z.string().max(200, "Company name is too long").nullable().optional(),
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
  city: z.string().max(200, "City name is too long").nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Schema for activating a user
 */
export const activateUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: roleEnum.optional(),
  parent_id: z.string().uuid("Invalid parent ID").nullable().optional(),
  // Note: country_id, state_id, and city are not included as they're set during registration
  // Global Director can edit these later if needed
});

/**
 * Form schemas that include password field for UI forms
 * Using a unified schema that works for both create and edit modes
 */
export const userFormSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  first_name: z.string().min(1, "First name is required").max(100, "First name is too long").optional(),
  last_name: z.string().max(100, "Last name is too long").nullable().optional(),
  role: roleEnum.optional(),
  parent_id: z.string().uuid("Invalid parent ID").nullable().optional(),
  country_id: z.string().uuid("Invalid country ID").optional(),
  state_id: z.string().uuid("Invalid state ID").nullable().optional(),
  city: z.string().max(200, "City name is too long").nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)")
    .nullable()
    .optional(),
  company: z.string().max(200, "Company name is too long").nullable().optional(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || val.length >= 8, "Password must be at least 8 characters")
    .transform((val) => (val && val.trim() !== "" ? val : undefined)),
});

export const createUserFormSchema = userFormSchema.extend({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  first_name: z.string().min(1, "First name is required").max(100, "First name is too long"),
  role: roleEnum,
});

export const updateUserFormSchema = updateUserSchema;

/**
 * TypeScript types derived from schemas
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFormInput = z.infer<typeof userFormSchema>;
export type CreateUserFormInput = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormInput = z.infer<typeof updateUserFormSchema>;
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
export type GlobalDirectorPasswordInput = z.infer<typeof globalDirectorPasswordSchema>;
export type RegisterWithInvitationInput = z.infer<typeof registerWithInvitationSchema>;
export type ActivateUserInput = z.infer<typeof activateUserSchema>;
export type Role = z.infer<typeof roleEnum>;
