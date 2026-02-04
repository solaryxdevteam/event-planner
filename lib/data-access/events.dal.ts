/**
 * Event Data Access Layer (DAL)
 *
 * Pure database operations for events table
 * No business logic - just CRUD operations
 *
 * IMPORTANT: Authorization is handled by passing subordinateUserIds
 * from the Service Layer. No RLS is used in this application.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

/**
 * Event with creator and venue information
 */
export interface EventWithRelations extends Event {
  creator?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  venue?: {
    id: string;
    short_id?: string | null;
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    location_lat?: number | null;
    location_lng?: number | null;
    images?: string[] | null;
    capacity_seated?: number | null;
    capacity_standing?: number | null;
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
  } | null;
}

/**
 * Raw event data from Supabase with relations
 */
interface EventWithRelationsRaw extends Event {
  creator?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
  venue?: {
    id: string;
    short_id?: string | null;
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    location_lat?: number | null;
    location_lng?: number | null;
    images?: string[] | null;
    capacity_seated?: number | null;
    capacity_standing?: number | null;
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
  } | null;
}

/**
 * Get a single event by ID (with authorization check)
 *
 * @param id - Event UUID
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param includeRelations - Whether to include creator and venue information
 */
export async function findById(
  id: string,
  subordinateUserIds: string[],
  includeRelations: boolean = true
): Promise<EventWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      includeRelations
        ? `
          *,
          creator:users!events_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          venue:venues!events_venue_id_fkey (
            id,
            short_id,
            name,
            address,
            city,
            state,
            country,
            location_lat,
            location_lng,
            images
          )
        `
        : "*"
    )
    .eq("id", id)
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch event: ${error.message}`);
  }

  // Transform data to construct creator name
  if (data && includeRelations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedData = data as any;
    return {
      ...typedData,
      creator: typedData.creator
        ? {
            id: typedData.creator.id,
            email: typedData.creator.email,
            role: typedData.creator.role,
            name: typedData.creator.last_name
              ? `${typedData.creator.first_name} ${typedData.creator.last_name}`
              : typedData.creator.first_name,
          }
        : undefined,
      venue: typedData.venue || null,
    } as EventWithRelations;
  }

  return data as EventWithRelations;
}

/**
 * Get a single event by short_id (with authorization check)
 *
 * @param shortId - Event short ID (e.g., "EVT-ABC123")
 * @param subordinateUserIds - Array of user IDs that the current user can see (includes self + subordinates)
 * @param includeRelations - Whether to include creator and venue information
 */
export async function findByShortId(
  shortId: string,
  subordinateUserIds: string[],
  includeRelations: boolean = true
): Promise<EventWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      includeRelations
        ? `
          *,
          creator:users!events_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          venue:venues!events_venue_id_fkey (
            id,
            short_id,
            name,
            address,
            city,
            state,
            country,
            location_lat,
            location_lng,
            images
          )
        `
        : "*"
    )
    .eq("short_id", shortId)
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found or no permission
      return null;
    }
    throw new Error(`Failed to fetch event: ${error.message}`);
  }

  // Transform data to construct creator name
  if (data && includeRelations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedData = data as any;
    return {
      ...typedData,
      creator: typedData.creator
        ? {
            id: typedData.creator.id,
            email: typedData.creator.email,
            role: typedData.creator.role,
            name: typedData.creator.last_name
              ? `${typedData.creator.first_name} ${typedData.creator.last_name}`
              : typedData.creator.first_name,
          }
        : undefined,
      venue: typedData.venue || null,
    } as EventWithRelations;
  }

  return data as EventWithRelations;
}

/**
 * Get events by creator (with authorization check)
 *
 * @param creatorId - Creator user ID
 * @param subordinateUserIds - Array of user IDs that the current user can see
 * @param status - Optional status filter
 * @param includeRelations - Whether to include creator and venue information
 */
export async function findByCreator(
  creatorId: string,
  subordinateUserIds: string[],
  status?: string,
  includeRelations: boolean = true
): Promise<EventWithRelations[]> {
  const supabase = await createClient();

  // Ensure creator is in visible users
  if (!subordinateUserIds.includes(creatorId)) {
    return [];
  }

  let query = supabase
    .from("events")
    .select(
      includeRelations
        ? `
          *,
          creator:users!events_creator_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          ),
          venue:venues!events_venue_id_fkey (
            id,
            short_id,
            name,
            address,
            city,
            state,
            country,
            location_lat,
            location_lng,
            images
          )
        `
        : "*"
    )
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  // Transform data to construct creator name
  return (data || []).map((event: EventWithRelationsRaw) => ({
    ...event,
    creator: event.creator
      ? {
          id: event.creator.id,
          email: event.creator.email,
          role: event.creator.role,
          name: event.creator.last_name
            ? `${event.creator.first_name} ${event.creator.last_name}`
            : event.creator.first_name,
        }
      : undefined,
    venue: event.venue || null,
  })) as EventWithRelations[];
}

/**
 * Filter options for finding events
 */
export interface EventFilterOptions {
  status?: string | string[];
  creatorId?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  startsAtFrom?: string;
  startsAtTo?: string;
  search?: string;
  state?: string; // Filter by venue state
  page?: number;
  pageSize?: number;
  includeRelations?: boolean;
}

/**
 * Get events visible to user with filters (pyramid visibility)
 *
 * @param subordinateUserIds - Array of user IDs that the current user can see
 * @param filters - Filter options
 */
export async function findPyramidVisible(
  subordinateUserIds: string[],
  filters: EventFilterOptions = {}
): Promise<EventWithRelations[]> {
  const supabase = await createClient();

  const {
    status,
    creatorId,
    venueId,
    dateFrom,
    dateTo,
    startsAtFrom,
    startsAtTo,
    search,
    state,
    includeRelations = true,
  } = filters;

  // Build select query - need to include venue state for filtering
  const selectQuery = includeRelations
    ? `
      *,
      creator:users!events_creator_id_fkey (
        id,
        first_name,
        last_name,
        email,
        role
      ),
      venue:venues!events_venue_id_fkey (
        id,
        short_id,
        name,
        address,
        city,
        state,
        country,
        location_lat,
        location_lng,
        images
      )
    `
    : "*";

  let query = supabase
    .from("events")
    .select(selectQuery)
    .in("creator_id", subordinateUserIds) // Backend authorization filter
    .order("created_at", { ascending: false });

  // Apply filters
  if (status) {
    if (Array.isArray(status)) {
      query = query.in("status", status);
    } else {
      query = query.eq("status", status);
    }
  }

  if (creatorId) {
    query = query.eq("creator_id", creatorId);
  }

  if (venueId) {
    query = query.eq("venue_id", venueId);
  }

  // Note: dateFrom and dateTo filters now use starts_at instead of event_date
  if (dateFrom) {
    // If dateFrom is just a date (no time), ensure it starts at beginning of day
    const normalizedDateFrom = dateFrom.includes("T") ? dateFrom : `${dateFrom}T00:00:00.000Z`;
    query = query.gte("starts_at", normalizedDateFrom);
  }

  if (dateTo) {
    // If dateTo is just a date (no time), ensure it includes the entire day by using end of day
    const normalizedDateTo = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`;
    query = query.lte("starts_at", normalizedDateTo);
  }

  if (startsAtFrom) {
    query = query.gte("starts_at", startsAtFrom);
  }

  if (startsAtTo) {
    query = query.lte("starts_at", startsAtTo);
  }

  if (search && search.trim().length > 0) {
    query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  }

  // Note: State filtering is done in-memory after fetching
  // because Supabase doesn't easily support filtering on nested relations (venue.state)
  // For better performance at scale, consider using a database view or function

  // Apply pagination if provided (but note: if state filter is active,
  // we'll need to fetch more and filter, then paginate)
  const needsInMemoryFilter = state;
  const fetchLimit =
    needsInMemoryFilter && filters.pageSize
      ? (filters.page || 1) * (filters.pageSize * 2) // Fetch more to account for filtering
      : undefined;

  if (fetchLimit) {
    query = query.limit(fetchLimit);
  } else if (filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  // Transform data to construct creator name
  let events = (data || []).map((event: EventWithRelationsRaw) => ({
    ...event,
    creator: event.creator
      ? {
          id: event.creator.id,
          email: event.creator.email,
          role: event.creator.role,
          name: event.creator.last_name
            ? `${event.creator.first_name} ${event.creator.last_name}`
            : event.creator.first_name,
        }
      : undefined,
    venue: event.venue || null,
  })) as EventWithRelations[];

  // Apply state filter in memory (filter by venue.state)
  if (state) {
    events = events.filter((event) => {
      const venueState = event.venue?.state;
      return venueState && venueState.toLowerCase() === state.toLowerCase();
    });
  }

  // Apply pagination after in-memory filtering if needed
  if (needsInMemoryFilter && filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize;
    events = events.slice(from, to);
  }

  return events;
}

/**
 * Create a new event
 */
export async function insert(event: EventInsert): Promise<Event> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(event)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing event
 */
export async function update(id: string, event: EventUpdate): Promise<Event> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update({
      ...event,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  return data;
}

/**
 * Hard delete an event (only for drafts)
 */
export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}

/**
 * Check if a venue has any upcoming events
 * An event is considered "upcoming" if it has status 'approved_scheduled'
 *
 * @param venueId - Venue UUID
 * @returns True if venue has upcoming events, false otherwise
 */
export async function hasUpcomingEvents(venueId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check for events that:
  // - Are associated with this venue
  // - Have status 'approved_scheduled' (approved and scheduled events)
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("status", "approved_scheduled");

  if (error) {
    throw new Error(`Failed to check upcoming events: ${error.message}`);
  }

  return (count || 0) > 0;
}
