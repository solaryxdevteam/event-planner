/**
 * Invitation Service
 * Business logic for invitation management
 */

import { createClient } from "@/lib/supabase/server";
import * as invitationsDal from "@/lib/data-access/invitations.dal";
import type { InvitationWithCountry } from "@/lib/data-access/invitations.dal";
import * as emailService from "../email/email.service";
import type { CreateInvitationInput } from "@/lib/validation/invitations.schema";
import type { Invitation } from "@/lib/types/database.types";
import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  // Generate 32 random bytes and encode as Base64URL
  const bytes = randomBytes(32);
  return bytes.toString("base64url");
}

/**
 * Create an invitation
 *
 * @param creatorId - ID of Global Director creating the invitation
 * @param data - Invitation data (email, country_id, expires_in_days)
 * @returns Created invitation with token
 * @throws Error if validation fails or creator lacks permissions
 */
export async function createInvitation(creatorId: string, data: CreateInvitationInput): Promise<Invitation> {
  const supabase = await createClient();

  // Verify creator is Global Director
  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", creatorId)
    .single<{ role: string }>();

  if (creatorError || !creator) {
    throw new Error("Failed to verify permissions");
  }

  if (creator.role !== "global_director") {
    throw new Error("Only Global Directors can create invitations");
  }

  // Validate country_id exists
  const { data: country, error: countryError } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", data.country_id)
    .eq("type", "country")
    .single<{ id: string; name: string }>();

  if (countryError || !country) {
    throw new Error("Invalid country ID");
  }

  // Check if email already has a pending invitation
  const existingInvitations = await invitationsDal.findByEmail(data.email);
  if (existingInvitations.length > 0) {
    throw new Error("An active invitation already exists for this email");
  }

  // Generate token
  const token = generateToken();

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expires_in_days || 7));

  // Create invitation
  const invitation = await invitationsDal.insert({
    token,
    email: data.email,
    country_id: data.country_id,
    created_by: creatorId,
    expires_at: expiresAt.toISOString(),
  });

  // Send invitation email
  try {
    await emailService.sendInvitationEmail(invitation, country.name);
  } catch (error) {
    // Log error but don't fail invitation creation
    console.error("Failed to send invitation email:", error);
  }

  return invitation;
}

/**
 * Validate an invitation token
 *
 * @param token - Invitation token
 * @returns Invitation if valid, null otherwise
 */
export async function validateInvitation(token: string): Promise<Invitation | null> {
  const invitation = await invitationsDal.findByToken(token);

  if (!invitation) {
    return null;
  }

  // Check if already used
  if (invitation.used_at) {
    return null;
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);

  if (now > expiresAt) {
    return null;
  }

  return invitation;
}

/**
 * Get invitation by token (includes validation)
 *
 * @param token - Invitation token
 * @returns Invitation details including country_id
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  return validateInvitation(token);
}

/**
 * Revoke an invitation
 *
 * @param creatorId - ID of user revoking the invitation
 * @param invitationId - ID of invitation to revoke
 * @throws Error if creator lacks permissions
 */
export async function revokeInvitation(creatorId: string, invitationId: string): Promise<void> {
  const supabase = await createClient();

  // Verify creator is Global Director
  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", creatorId)
    .single<{ role: string }>();

  if (creatorError || !creator) {
    throw new Error("Failed to verify permissions");
  }

  if (creator.role !== "global_director") {
    throw new Error("Only Global Directors can revoke invitations");
  }

  await invitationsDal.revoke(invitationId);
}

/**
 * List all invitations (for Global Director), with country names
 */
export async function listInvitations(): Promise<InvitationWithCountry[]> {
  const invitations = await invitationsDal.listAll();
  const countryIds = [...new Set(invitations.map((i) => i.country_id))];
  const nameMap = await invitationsDal.getLocationNamesByIds(countryIds);
  return invitations.map((inv) => ({
    ...inv,
    country_name: nameMap.get(inv.country_id) ?? null,
  }));
}

/**
 * Resend an invitation: revoke the old one and create + send a new one with same email/country.
 */
export async function resendInvitation(creatorId: string, invitationId: string): Promise<Invitation> {
  const supabase = await createClient();

  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", creatorId)
    .single<{ role: string }>();

  if (creatorError || !creator || creator.role !== "global_director") {
    throw new Error("Only Global Directors can resend invitations");
  }

  const oldInv = await invitationsDal.findById(invitationId);
  if (!oldInv) {
    throw new Error("Invitation not found");
  }
  if (oldInv.used_at) {
    throw new Error("Cannot resend an invitation that has already been used");
  }

  await invitationsDal.revoke(invitationId);
  return createInvitation(creatorId, {
    email: oldInv.email,
    country_id: oldInv.country_id,
    expires_in_days: 7,
  });
}
