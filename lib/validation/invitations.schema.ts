/**
 * Invitation Validation Schemas
 * Zod schemas for invitation-related operations
 */

import { z } from "zod";

/**
 * Schema for creating an invitation
 */
export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  country_id: z.string().uuid("Country ID must be a valid UUID"),
  expires_in_days: z.number().int().min(1).max(90).optional().default(7),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

/**
 * Schema for validating an invitation token
 */
export const validateInvitationTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type ValidateInvitationTokenInput = z.infer<typeof validateInvitationTokenSchema>;
