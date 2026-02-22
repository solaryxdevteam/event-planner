/**
 * Invitations Data Access Layer
 * Uses service role so public validate/register (unauthenticated) and dashboard
 * create/list work despite RLS on invitations (no anon/authenticated policies).
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Invitation } from "@/lib/types/database.types";

export interface InvitationInsert {
  token: string;
  email: string;
  country_id: string;
  created_by: string;
  expires_at: string;
}

/**
 * Find invitation by id
 */
export async function findById(id: string): Promise<Invitation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("invitations").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as Invitation;
}

/**
 * Find invitation by token
 */
export async function findByToken(token: string): Promise<Invitation | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.from("invitations").select("*").eq("token", token).single();

  if (error || !data) {
    return null;
  }

  return data as Invitation;
}

/**
 * Find pending invitations for an email address
 */
export async function findByEmail(email: string): Promise<Invitation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Invitation[];
}

/**
 * Create a new invitation
 */
export async function insert(invitation: InvitationInsert): Promise<Invitation> {
  const supabase = createAdminClient();

  // @ts-expect-error - Supabase type inference issue with Database types
  const { data, error } = await supabase.from("invitations").insert(invitation).select().single();

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  return data as Invitation;
}

/**
 * Mark invitation as used
 */
export async function markAsUsed(token: string, usedAt: string = new Date().toISOString()): Promise<void> {
  const supabase = createAdminClient();

  // @ts-expect-error - Supabase type inference issue with Database types
  const { error } = await supabase.from("invitations").update({ used_at: usedAt }).eq("token", token);

  if (error) {
    throw new Error(`Failed to mark invitation as used: ${error.message}`);
  }
}

/**
 * Delete expired invitations (cleanup)
 */
export async function deleteExpired(): Promise<number> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("invitations")
    .delete()
    .lt("expires_at", now)
    .is("used_at", null)
    .select();

  if (error) {
    throw new Error(`Failed to delete expired invitations: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Revoke an invitation (delete it)
 */
export async function revoke(invitationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("invitations").delete().eq("id", invitationId);

  if (error) {
    throw new Error(`Failed to revoke invitation: ${error.message}`);
  }
}

export interface InvitationWithCountry extends Invitation {
  country_name: string | null;
}

/**
 * List all invitations (for admin)
 */
export async function listAll(): Promise<Invitation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list invitations: ${error.message}`);
  }

  return (data ?? []) as Invitation[];
}

/**
 * Get location names by IDs
 */
export async function getLocationNamesByIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("locations").select("id, name").in("id", ids);
  if (error) return new Map();
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set((row as { id: string; name: string }).id, (row as { id: string; name: string }).name);
  }
  return map;
}
