/**
 * Event Versions Data Access Layer (DAL)
 *
 * Pure database operations for event_versions table
 * Used for tracking modification requests and version history
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type EventVersion = Database["public"]["Tables"]["event_versions"]["Row"];
export type EventVersionInsert = Database["public"]["Tables"]["event_versions"]["Insert"];
type EventVersionUpdate = Database["public"]["Tables"]["event_versions"]["Update"];

/**
 * Get all versions for an event
 */
export async function findByEventId(eventId: string): Promise<EventVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_versions")
    .select("*")
    .eq("event_id", eventId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch event versions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the pending modification version for an event
 * Checks for versions with status "in_review" (modification in approval process)
 */
export async function findPendingVersion(eventId: string): Promise<EventVersion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_versions")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "in_review")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch pending version: ${error.message}`);
  }

  return data;
}

/**
 * Create a new event version
 */
export async function insert(version: EventVersionInsert): Promise<EventVersion> {
  const supabase = await createClient();

  // If version_number is not provided, get the next version number
  if (!version.version_number) {
    const existingVersions = await findByEventId(version.event_id);
    const maxVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.version_number)) : 0;
    version.version_number = maxVersion + 1;
  }

  const { data, error } = await supabase
    .from("event_versions")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(version)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event version: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing event version
 */
export async function update(id: string, version: EventVersionUpdate): Promise<EventVersion> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_versions")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update(version)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update event version: ${error.message}`);
  }

  return data;
}

/**
 * Delete an event version
 */
export async function deleteVersion(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("event_versions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete event version: ${error.message}`);
  }
}
