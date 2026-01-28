/**
 * Venue Templates Data Access Layer
 *
 * Handles database operations for venue templates
 * Templates are private to each user (enforced by user_id)
 */

import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types/database.types";
import type { CreateVenueInput } from "@/lib/validation/venues.schema";

export interface VenueTemplate extends Template {
  template_data: CreateVenueInput;
}

/**
 * Get all venue templates for a user
 */
export async function findByUserId(userId: string): Promise<VenueTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch venue templates: ${error.message}`);
  }

  return (data || []) as VenueTemplate[];
}

/**
 * Get a single venue template by ID
 * Only returns template if it belongs to the user
 */
export async function findById(templateId: string, userId: string): Promise<VenueTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch venue template: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as VenueTemplate;
}

/**
 * Create a new venue template
 */
export async function insert(userId: string, name: string, templateData: CreateVenueInput): Promise<VenueTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("templates")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert({
      user_id: userId,
      name,
      template_data: templateData as Template["template_data"],
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (same name for same user)
    if (error.code === "23505") {
      throw new Error(`A template with the name "${name}" already exists`);
    }
    throw new Error(`Failed to create venue template: ${error.message}`);
  }

  return data as VenueTemplate;
}

/**
 * Update an existing venue template
 * Only the owner can update their template
 */
export async function update(
  templateId: string,
  userId: string,
  updates: { name?: string; template_data?: CreateVenueInput }
): Promise<VenueTemplate> {
  const supabase = await createClient();

  const updateData: { name?: string; template_data?: Template["template_data"] } = {};
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.template_data !== undefined) {
    updateData.template_data = updates.template_data as Template["template_data"];
  }

  const { data, error } = await supabase
    .from("templates")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update(updateData)
    .eq("id", templateId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Template not found or you don't have permission to update it");
    }
    if (error.code === "23505") {
      throw new Error(`A template with the name "${updates.name}" already exists`);
    }
    throw new Error(`Failed to update venue template: ${error.message}`);
  }

  return data as VenueTemplate;
}

/**
 * Delete a venue template
 * Only the owner can delete their template
 */
export async function deleteTemplate(templateId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("templates").delete().eq("id", templateId).eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete venue template: ${error.message}`);
  }
}
