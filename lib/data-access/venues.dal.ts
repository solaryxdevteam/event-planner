/**
 * Venue Data Access Layer (DAL)
 *
 * Pure database operations for venues table
 * No business logic - just CRUD operations
 *
 * IMPORTANT: Authorization is handled by passing subordinateUserIds
 * from the Service Layer. No RLS is used in this application.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];

/**
 * Venue with creator information
 */
export interface VenueWithCreator extends Venue {
  creator: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Get all venues filtered by subordinate user IDs
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param options - Additional query options
 */
export async function findAll(
  subordinateUserIds: string[],
  options?: {
    includeCreator?: boolean;
    activeOnly?: boolean;
  }
): Promise<VenueWithCreator[]> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select(
      options?.includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            name,
            email,
            role
          )
        `
        : "*"
    )
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .order("name", { ascending: true });

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  return data as VenueWithCreator[];
}

/**
 * Get a single venue by ID (with authorization check)
 *
 * @param id - Venue ID
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param includeCreator - Whether to include creator information
 */
export async function findById(
  id: string,
  subordinateUserIds: string[],
  includeCreator: boolean = true
): Promise<VenueWithCreator | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select(
      includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            name,
            email,
            role
          )
        `
        : "*"
    )
    .eq("id", id)
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  return data as VenueWithCreator;
}

/**
 * Find duplicate venues by name, address, and city
 * Used to prevent creating duplicates
 *
 * Note: This searches across ALL venues (not filtered by user) to ensure
 * duplicates are detected system-wide, regardless of who created them.
 */
export async function findDuplicate(
  name: string,
  address: string,
  city: string,
  excludeId?: string
): Promise<Venue | null> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select("*")
    .eq("is_active", true)
    .ilike("name", name.trim())
    .ilike("address", address.trim())
    .ilike("city", city.trim());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to check for duplicates: ${error.message}`);
  }

  return data;
}

/**
 * Create a new venue
 */
export async function insert(venue: VenueInsert): Promise<Venue> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("venues").insert(venue).select().single();

  if (error) {
    throw new Error(`Failed to create venue: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing venue
 */
export async function update(id: string, venue: VenueUpdate): Promise<Venue> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .update({
      ...venue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update venue: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete a venue (set is_active = false)
 */
export async function softDelete(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete venue: ${error.message}`);
  }
}

/**
 * Search venues by name or city (filtered by subordinate user IDs)
 *
 * @param searchQuery - Search term for name, city, or address
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param includeCreator - Whether to include creator information
 */
export async function search(
  searchQuery: string,
  subordinateUserIds: string[],
  includeCreator: boolean = true
): Promise<VenueWithCreator[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select(
      includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            name,
            email,
            role
          )
        `
        : "*"
    )
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .eq("is_active", true)
    .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
    .order("name", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  return data as VenueWithCreator[];
}
