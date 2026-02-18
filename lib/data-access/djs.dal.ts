/**
 * DJ Data Access Layer (DAL)
 *
 * Pure database operations for djs table.
 * No business logic - just CRUD. Authorization in service layer.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { customAlphabet } from "nanoid";

type DJ = Database["public"]["Tables"]["djs"]["Row"];
type DJInsert = Database["public"]["Tables"]["djs"]["Insert"];
type DJUpdate = Database["public"]["Tables"]["djs"]["Update"];

const generateShortId = (): string => {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 7);
  return `dj-${nanoid()}`;
};

export type DJFilterOptions = {
  search?: string;
  activeOnly?: boolean;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export interface PaginatedDJs {
  data: DJ[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Find all DJs with optional filters and pagination.
 * By default returns active, non-deleted only.
 */
export async function findAll(options: DJFilterOptions = {}): Promise<PaginatedDJs> {
  const supabase = await createClient();
  const { search, activeOnly = true, includeDeleted = false, page = 1, pageSize = 12 } = options;

  let query = supabase.from("djs").select("*", { count: "exact" });

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (activeOnly) {
    query = query.eq("is_active", true);
  }
  if (search && search.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,music_style.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    );
  }

  query = query.order("name", { ascending: true });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch DJs: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    data: (data || []) as DJ[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get all active non-deleted DJs (for selection dropdowns, no pagination).
 */
export async function findAllActive(search?: string): Promise<DJ[]> {
  const supabase = await createClient();
  let query = supabase
    .from("djs")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(200);

  if (search && search.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,music_style.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch DJs: ${error.message}`);
  }
  return (data || []) as DJ[];
}

/**
 * Get a single DJ by ID (UUID).
 */
export async function findById(id: string): Promise<DJ | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("djs").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch DJ: ${error.message}`);
  }
  return data as DJ | null;
}

/**
 * Get a single DJ by short_id.
 */
export async function findByShortId(shortId: string): Promise<DJ | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("djs").select("*").eq("short_id", shortId).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch DJ: ${error.message}`);
  }
  return data as DJ | null;
}

/**
 * Create a new DJ. Generates short_id if not provided.
 */
export async function insert(dj: DJInsert): Promise<DJ> {
  const supabase = await createClient();
  let shortId = (dj as { short_id?: string | null }).short_id;
  if (!shortId) {
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      shortId = generateShortId();
      const { data: existing } = await supabase.from("djs").select("id").eq("short_id", shortId).maybeSingle();
      if (!existing) break;
      attempts++;
    }
    if (!shortId) {
      throw new Error("Failed to generate unique DJ short_id after multiple attempts");
    }
  }
  const { data, error } = await supabase
    .from("djs")
    // @ts-expect-error - Supabase type inference
    .insert({
      ...dj,
      short_id: shortId,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to create DJ: ${error.message}`);
  }
  return data as DJ;
}

/**
 * Update an existing DJ.
 */
export async function update(id: string, updates: DJUpdate): Promise<DJ> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("djs")
    // @ts-expect-error - Supabase type inference
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to update DJ: ${error.message}`);
  }
  return data as DJ;
}

/**
 * Soft delete: set deleted_at.
 */
export async function softDelete(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("djs")
    // @ts-expect-error - Supabase type inference
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to delete DJ: ${error.message}`);
  }
}

/**
 * Set is_active to false (deactivate).
 */
export async function deactivate(id: string): Promise<void> {
  await update(id, { is_active: false });
}

/**
 * Set is_active to true (activate).
 */
export async function activate(id: string): Promise<void> {
  await update(id, { is_active: true });
}
