/**
 * Profile Validation Schemas
 *
 * Zod schemas for profile-related operations
 */

import { z } from "zod";

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z
  .object({
    first_name: z.string().min(1, "First name is required").max(100, "First name is too long"),
    last_name: z.string().max(100, "Last name is too long").nullable().optional(),
    city: z.string().max(200, "City name is too long").nullable().optional(),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || val === "" || /^\+?[1-9]\d{1,14}$/.test(val),
        "Phone number must be in E.164 format (e.g., +1234567890)"
      )
      .nullable(),
    password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    password_confirmation: z.string().optional().or(z.literal("")),
    // Global Director only fields (optional, but if provided must be valid)
    email: z.string().email("Invalid email address").optional(),
    role: z
      .enum([
        "event_planner",
        "city_curator",
        "regional_curator",
        "lead_curator",
        "global_director",
        "marketing_manager",
      ])
      .optional(),
    status: z.enum(["pending", "active", "inactive"]).optional(),
    /** Required when changing password; from OTP verification before password change */
    password_change_verification_token: z.string().optional(),
  })
  .refine(
    (data) => {
      // If password is provided, password_confirmation must be provided and match
      if (data.password && data.password.trim() !== "") {
        if (!data.password_confirmation || data.password_confirmation.trim() === "") {
          return false;
        }
        if (data.password !== data.password_confirmation) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["password_confirmation"],
    }
  )
  .refine(
    (data) => {
      // If password_confirmation is provided, password must also be provided
      if (data.password_confirmation && data.password_confirmation.trim() !== "") {
        if (!data.password || data.password.trim() === "") {
          return false;
        }
      }
      return true;
    },
    {
      message: "Please enter a password",
      path: ["password"],
    }
  );

/**
 * TypeScript types derived from schemas
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
