/**
 * Invitation Server Actions
 */

"use server";

import { requireRole } from "@/lib/auth/server";
import type { ActionResponse } from "@/lib/types/api.types";
import type { Invitation } from "@/lib/types/database.types";
import type { InvitationWithCountry } from "@/lib/data-access/invitations.dal";
import { handleAsync } from "@/lib/utils/response";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { createInvitationSchema } from "@/lib/validation/invitations.schema";
import { revalidatePath } from "next/cache";

const USERS_PAGE_PATH = "/dashboard/users";

/**
 * Create an invitation
 *
 * @param formData - Form data or CreateInvitationInput object
 */
export async function createInvitation(
  formData: FormData | { email: string; country_id: string; expires_in_days?: number }
): Promise<ActionResponse<Invitation>> {
  return handleAsync(async () => {
    const user = await requireRole(["global_director"]);

    // Parse form data
    let data: { email: string; country_id: string; expires_in_days?: number };

    if (formData instanceof FormData) {
      data = {
        email: formData.get("email") as string,
        country_id: formData.get("country_id") as string,
        expires_in_days: formData.get("expires_in_days")
          ? parseInt(formData.get("expires_in_days") as string)
          : undefined,
      };
    } else {
      data = formData;
    }

    // Validate input
    const validated = createInvitationSchema.parse(data);

    // Create invitation
    const invitation = await invitationService.createInvitation(user.id, validated);

    revalidatePath(USERS_PAGE_PATH);
    return invitation;
  }, "createInvitation");
}

/**
 * Validate an invitation token
 *
 * @param token - Invitation token
 */
export async function validateInvitation(token: string): Promise<ActionResponse<Invitation>> {
  return handleAsync(async () => {
    const invitation = await invitationService.validateInvitation(token);

    if (!invitation) {
      throw new Error("Invalid or expired invitation token");
    }

    return invitation;
  }, "validateInvitation");
}

/**
 * List all invitations (Global Director only)
 */
export async function listInvitations(): Promise<ActionResponse<InvitationWithCountry[]>> {
  return handleAsync(async () => {
    await requireRole(["global_director"]);
    return invitationService.listInvitations();
  }, "listInvitations");
}

/**
 * Resend an invitation: removes old one and sends a new invitation email
 *
 * @param invitationId - ID of invitation to resend
 */
export async function resendInvitation(invitationId: string): Promise<ActionResponse<Invitation>> {
  return handleAsync(async () => {
    const user = await requireRole(["global_director"]);
    const invitation = await invitationService.resendInvitation(user.id, invitationId);
    revalidatePath(USERS_PAGE_PATH);
    return invitation;
  }, "resendInvitation");
}

/**
 * Revoke an invitation
 *
 * @param invitationId - ID of invitation to revoke
 */
export async function revokeInvitation(invitationId: string): Promise<ActionResponse<void>> {
  return handleAsync(async () => {
    const user = await requireRole(["global_director"]);

    await invitationService.revokeInvitation(user.id, invitationId);

    revalidatePath(USERS_PAGE_PATH);
    return undefined;
  }, "revokeInvitation");
}
