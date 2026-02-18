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
import { customAlphabet } from "nanoid";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];

/**
 * Generate a unique short ID for venues
 * Format: venue-XXXXX (where XXXXX is a random alphanumeric string)
 */
const generateShortId = (): string => {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 7);
  return `venue-${nanoid()}`;
};

/**
 * Venue with creator and location information
 */
export interface VenueWithCreator extends Venue {
  creator: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    avatar_url: string | null;
  };
  country_location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

/**
 * Raw venue data from Supabase with creator and location relations
 */
interface VenueWithCreatorRaw extends Venue {
  creator?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  country_location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

/**
 * Get all venues filtered by subordinate user IDs
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates), or null for global directors (see all venues)
 * @param options - Additional query options
 */
export async function findAll(
  subordinateUserIds: string[] | null,
  options?: {
    includeCreator?: boolean;
    activeOnly?: boolean;
  }
): Promise<VenueWithCreator[]> {
  const supabase = await createClient();

  let query = supabase.from("venues").select(
    options?.includeCreator
      ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          )
        `
      : "*"
  );

  // Exclude soft-deleted venues
  query = query.is("deleted_at", null);

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  query = query.order("created_at", { ascending: false });

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true).eq("approval_status", "approved");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  // Transform data to construct creator name and include locations
  return (data || []).map((venue: VenueWithCreatorRaw) => ({
    ...venue,
    creator: venue.creator
      ? {
          id: venue.creator.id,
          email: venue.creator.email,
          role: venue.creator.role,
          name: venue.creator.last_name
            ? `${venue.creator.first_name} ${venue.creator.last_name}`
            : venue.creator.first_name,
        }
      : undefined,
    country_location: venue.country_location || null,
  })) as VenueWithCreator[];
}

/**
 * Get a single venue by short_id (with authorization check)
 *
 * @param shortId - Venue short ID (format: venue-XXXXX)
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates), or null for global directors (see all venues)
 * @param includeCreator - Whether to include creator information
 */
export async function findByShortId(
  shortId: string,
  subordinateUserIds: string[] | null,
  includeCreator: boolean = true
): Promise<VenueWithCreator | null> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select(
      includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role,
            phone,
            avatar_url
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
    .eq("short_id", shortId)
    .is("deleted_at", null);

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  // Transform data to construct creator name and include locations
  if (data) {
    const typedData = data as VenueWithCreatorRaw;
    return {
      ...typedData,
      creator:
        includeCreator && typedData.creator
          ? {
              id: typedData.creator.id,
              name: typedData.creator.last_name
                ? `${typedData.creator.first_name} ${typedData.creator.last_name}`
                : typedData.creator.first_name,
              email: typedData.creator.email,
              role: typedData.creator.role,
              phone: typedData.creator.phone ?? null,
              avatar_url: typedData.creator.avatar_url ?? null,
            }
          : undefined,
      country_location: typedData.country_location || null,
    } as VenueWithCreator;
  }

  return null;
}

/**
 * Get a single venue by ID (with authorization check)
 * For backward compatibility - prefer findByShortId
 *
 * @param id - Venue UUID
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates), or null for global directors (see all venues)
 * @param includeCreator - Whether to include creator information
 */
export async function findById(
  id: string,
  subordinateUserIds: string[] | null,
  includeCreator: boolean = true
): Promise<VenueWithCreator | null> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select(
      includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
    .eq("id", id)
    .is("deleted_at", null);

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }

  // Transform data to construct creator name and include locations
  if (data) {
    const typedData = data as VenueWithCreatorRaw;
    return {
      ...typedData,
      creator:
        includeCreator && typedData.creator
          ? {
              ...typedData.creator,
              name: typedData.creator.last_name
                ? `${typedData.creator.first_name} ${typedData.creator.last_name}`
                : typedData.creator.first_name,
            }
          : undefined,
      country_location: typedData.country_location || null,
    } as VenueWithCreator;
  }

  return null;
}

/**
 * Find duplicate venues by name, street, city, and country
 * Used to prevent creating duplicates
 *
 * Note: This searches across ALL venues (not filtered by user) to ensure
 * duplicates are detected system-wide, regardless of who created them.
 */
export async function findDuplicate(
  name: string,
  street: string,
  city: string,
  country: string,
  excludeId?: string
): Promise<Venue | null> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .ilike("name", name.trim())
    .ilike("street", street.trim())
    .ilike("city", city.trim())
    .ilike("country", country.trim());

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
 * Generates a unique short_id automatically
 */
export async function insert(venue: VenueInsert): Promise<Venue> {
  const supabase = await createClient();

  // Generate unique short_id if not provided
  let shortId = venue.short_id;
  if (!shortId) {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      shortId = generateShortId();

      // Check if short_id already exists
      const { data: existing } = await supabase.from("venues").select("id").eq("short_id", shortId).maybeSingle();

      if (!existing) {
        break; // Unique short_id found
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique short_id after multiple attempts");
    }
  }

  const { data, error } = await supabase
    .from("venues")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert({ ...venue, short_id: shortId })
    .select()
    .single();

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
    // @ts-expect-error - Supabase type inference issue with Database types
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
 * Soft delete a venue (set deleted_at so it is hidden from all lists and lookups)
 */
export async function softDelete(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete venue: ${error.message}`);
  }
}

/**
 * Ban a venue (set is_active = false). Does not set deleted_at; use softDelete for user-initiated delete.
 */
export async function banVenue(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to ban venue: ${error.message}`);
  }
}

/**
 * Unban a venue (set is_active = true)
 */
export async function unbanVenue(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("venues")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to unban venue: ${error.message}`);
  }
}

/**
 * Search venues by name or city (filtered by subordinate user IDs)
 *
 * @param searchQuery - Search term for name, city, or address
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates), or null for global directors (see all venues)
 * @param includeCreator - Whether to include creator information
 */
export async function search(
  searchQuery: string,
  subordinateUserIds: string[] | null,
  includeCreator: boolean = true
): Promise<VenueWithCreator[]> {
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select(
      includeCreator
        ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
    .is("deleted_at", null)
    .eq("is_active", true)
    .or(
      `name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,street.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`
    );

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  const { data, error } = await query.order("name", { ascending: true }).limit(50);

  if (error) {
    throw new Error(`Failed to search venues: ${error.message}`);
  }

  // Transform data to construct creator name and include locations
  return (data || []).map((venue: VenueWithCreatorRaw) => ({
    ...venue,
    creator: venue.creator
      ? {
          id: venue.creator.id,
          email: venue.creator.email,
          role: venue.creator.role,
          name: venue.creator.last_name
            ? `${venue.creator.first_name} ${venue.creator.last_name}`
            : venue.creator.first_name,
        }
      : undefined,
    country_location: venue.country_location || null,
  })) as VenueWithCreator[];
}

/**
 * Filter and paginate venues with AND logic
 * All filters are combined with AND (all must match)
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see
 * @param options - Filter and pagination options
 */
/** Single dropdown: approval status, verified, and is_active */
export type VenueStatusFilter =
  | "all"
  | "active"
  | "banned"
  | "pending"
  | "approved"
  | "rejected"
  | "verified"
  | "not_verified";

export interface VenueFilterOptions {
  search?: string;
  status?: VenueStatusFilter;
  totalCapacityMin?: number | null;
  totalCapacityMax?: number | null;
  numberOfTablesMin?: number | null;
  numberOfTablesMax?: number | null;
  ticketCapacityMin?: number | null;
  ticketCapacityMax?: number | null;
  page?: number;
  pageSize?: number;
  includeCreator?: boolean;
  onlyOwn?: boolean;
}

export interface PaginatedVenues {
  data: VenueWithCreator[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function findAllWithFilters(
  subordinateUserIds: string[] | null,
  options: VenueFilterOptions = {}
): Promise<PaginatedVenues> {
  const supabase = await createClient();
  const {
    search: searchQuery,
    status = "all",
    totalCapacityMin,
    totalCapacityMax,
    numberOfTablesMin,
    numberOfTablesMax,
    ticketCapacityMin,
    ticketCapacityMax,
    page = 1,
    pageSize = 9,
    includeCreator = true,
  } = options;

  // Build base query
  let query = supabase.from("venues").select(
    includeCreator
      ? `
          *,
          creator:users!venues_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          )
        `
      : "*",
    { count: "exact" }
  );

  // Exclude soft-deleted venues
  query = query.is("deleted_at", null);

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  // Apply status filter (AND) — one dropdown: approval status, verified, is_active
  if (status === "active") {
    query = query.eq("is_active", true).eq("approval_status", "approved");
  } else if (status === "banned") {
    query = query.eq("is_active", false);
  } else if (status === "pending") {
    query = query.eq("approval_status", "pending");
  } else if (status === "approved") {
    query = query.eq("approval_status", "approved");
  } else if (status === "rejected") {
    query = query.eq("approval_status", "rejected");
  } else if (status === "verified") {
    query = query.eq("contact_email_verified", true);
  } else if (status === "not_verified") {
    query = query.eq("contact_email_verified", false);
  }
  // "all" = no status filter

  // Apply search filter (AND) — search by name, city, or country
  if (searchQuery && searchQuery.trim().length > 0) {
    const trimmedQuery = searchQuery.trim();
    query = query.or(`name.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%,country.ilike.%${trimmedQuery}%`);
  }

  // Apply capacity filters (AND)
  if (totalCapacityMin !== null && totalCapacityMin !== undefined) {
    query = query.gte("total_capacity", totalCapacityMin);
  }
  if (totalCapacityMax !== null && totalCapacityMax !== undefined) {
    query = query.lte("total_capacity", totalCapacityMax);
  }
  if (numberOfTablesMin !== null && numberOfTablesMin !== undefined) {
    query = query.gte("number_of_tables", numberOfTablesMin);
  }
  if (numberOfTablesMax !== null && numberOfTablesMax !== undefined) {
    query = query.lte("number_of_tables", numberOfTablesMax);
  }
  if (ticketCapacityMin !== null && ticketCapacityMin !== undefined) {
    query = query.gte("ticket_capacity", ticketCapacityMin);
  }
  if (ticketCapacityMax !== null && ticketCapacityMax !== undefined) {
    query = query.lte("ticket_capacity", ticketCapacityMax);
  }

  // Order by created_at descending (newest first) — applied before range for correct pagination
  query = query.order("created_at", { ascending: false });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch venues: ${error.message}`);
  }

  // Transform data to construct creator name and include locations
  const transformedData = (data || []).map((venue: VenueWithCreatorRaw) => ({
    ...venue,
    creator: venue.creator
      ? {
          id: venue.creator.id,
          email: venue.creator.email,
          role: venue.creator.role,
          name: venue.creator.last_name
            ? `${venue.creator.first_name} ${venue.creator.last_name}`
            : venue.creator.first_name,
        }
      : undefined,
    country_location: venue.country_location || null,
  })) as VenueWithCreator[];

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: transformedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}
