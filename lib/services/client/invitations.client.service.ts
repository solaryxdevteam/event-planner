/**
 * Invitations Client Service
 *
 * Client-side service for invitation operations
 * Makes API calls to /api/invitations endpoints via API client
 * Does NOT access database directly
 */

import { apiClient } from "./api-client";
import type { Invitation } from "@/lib/types/database.types";

/**
 * Create invitation input
 */
export interface CreateInvitationInput {
  email: string;
  country_id: string;
  expires_in_days?: number;
}

/**
 * Create an invitation
 */
export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  return apiClient.post<Invitation>("/api/invitations", input);
}

/**
 * Validate an invitation token
 */
export async function validateInvitation(token: string): Promise<Invitation> {
  return apiClient.get<Invitation>("/api/invitations/validate", {
    params: { token } as Record<string, string | number | boolean | null | undefined>,
  });
}
