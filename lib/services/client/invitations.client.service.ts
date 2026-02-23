/**
 * Invitations Client Service
 *
 * Client-side service for invitation operations
 * Makes API calls to /api/invitations endpoints via API client
 * Does NOT access database or server actions
 */

import { apiClient } from "./api-client";
import type { Invitation } from "@/lib/types/database.types";

/**
 * Invitation with country name (from list API)
 */
export interface InvitationWithCountry extends Invitation {
  country_name: string | null;
}

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
 * List all invitations (Global Director only)
 */
export async function listInvitations(): Promise<InvitationWithCountry[]> {
  return apiClient.get<InvitationWithCountry[]>("/api/invitations");
}

/**
 * Validate an invitation token
 */
export async function validateInvitation(token: string): Promise<Invitation> {
  return apiClient.get<Invitation>("/api/invitations/validate", {
    params: { token } as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * Resend an invitation (invalidates old link, creates and sends new one)
 */
export async function resendInvitation(invitationId: string): Promise<Invitation> {
  return apiClient.post<Invitation>(`/api/invitations/${invitationId}/resend`);
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  return apiClient.delete<void>(`/api/invitations/${invitationId}`);
}
