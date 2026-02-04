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
  };
  country_location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  state_location?: {
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
  } | null;
  country_location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  state_location?: {
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
          ),
          state_location:locations!venues_state_id_fkey (
            id,
            name,
            code
          )
        `
      : "*"
  );

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  query = query.order("name", { ascending: true });

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
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
    state_location: venue.state_location || null,
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
            role
          ),
          country_location:locations!venues_country_id_fkey (
            id,
            name,
            code
          ),
          state_location:locations!venues_state_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
    .eq("short_id", shortId);

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
      state_location: typedData.state_location || null,
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
          ),
          state_location:locations!venues_state_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
    .eq("id", id);

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
      state_location: typedData.state_location || null,
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
 * Soft delete a venue (set is_active = false)
 */
export async function softDelete(id: string): Promise<void> {
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
    throw new Error(`Failed to delete venue: ${error.message}`);
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
          ),
          state_location:locations!venues_state_id_fkey (
            id,
            name,
            code
          )
        `
        : "*"
    )
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
    state_location: venue.state_location || null,
  })) as VenueWithCreator[];
}

/**
 * Filter and paginate venues with AND logic
 * All filters are combined with AND (all must match)
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see
 * @param options - Filter and pagination options
 */
export interface VenueFilterOptions {
  search?: string; // Search by name or city
  state?: string | null; // Filter by state (null = all states)
  status?: "active" | "banned" | "all"; // Filter by status
  specs?: string[]; // Filter by technical specs (sound, lights, screens)
  dateFrom?: string | null; // Filter by availability start date (ISO string)
  dateTo?: string | null; // Filter by availability end date (ISO string)
  standingMin?: number | null; // Minimum standing capacity
  standingMax?: number | null; // Maximum standing capacity
  seatedMin?: number | null; // Minimum seated capacity
  seatedMax?: number | null; // Maximum seated capacity
  page?: number; // Page number (1-indexed)
  pageSize?: number; // Items per page
  includeCreator?: boolean;
  onlyOwn?: boolean; // If true, only return venues created by the current user (not subordinates)
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
    state,
    status = "active",
    specs = [],
    dateFrom,
    dateTo,
    standingMin,
    standingMax,
    seatedMin,
    seatedMax,
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
          ),
          state_location:locations!venues_state_id_fkey (
            id,
            name,
            code
          )
        `
      : "*",
    { count: "exact" }
  );

  // Only filter by creator_id if subordinateUserIds is provided (null means see all venues - for global directors)
  if (subordinateUserIds !== null) {
    query = query.in("creator_id", subordinateUserIds); // Backend authorization filter
  }

  // Apply status filter (AND)
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "banned") {
    query = query.eq("is_active", false);
  }
  // "all" means no status filter

  // Apply state filter (AND)
  if (state && state !== "all") {
    query = query.eq("state", state);
  }

  // Apply search filter (AND) - search by name or city only
  if (searchQuery && searchQuery.trim().length > 0) {
    const trimmedQuery = searchQuery.trim();
    query = query.or(`name.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%`);
  }

  // Apply date range filter (AND)
  if (dateFrom) {
    query = query.gte("availability_start_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("availability_end_date", dateTo);
  }

  // Apply technical specs filter (AND) - venue must have ALL selected specs
  if (specs.length > 0) {
    specs.forEach((spec) => {
      if (spec === "sound") {
        query = query.eq("technical_specs->sound", true);
      } else if (spec === "lights") {
        query = query.eq("technical_specs->lights", true);
      } else if (spec === "screens") {
        query = query.eq("technical_specs->screens", true);
      }
    });
  }

  // Apply capacity filters (AND)
  if (standingMin !== null && standingMin !== undefined) {
    query = query.gte("capacity_standing", standingMin);
  }
  if (standingMax !== null && standingMax !== undefined) {
    query = query.lte("capacity_standing", standingMax);
  }
  if (seatedMin !== null && seatedMin !== undefined) {
    query = query.gte("capacity_seated", seatedMin);
  }
  if (seatedMax !== null && seatedMax !== undefined) {
    query = query.lte("capacity_seated", seatedMax);
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  // Order by name
  query = query.order("name", { ascending: true });

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
    state_location: venue.state_location || null,
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
