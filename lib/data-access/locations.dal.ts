/**
 * Locations Data Access Layer (DAL)
 *
 * Pure database operations for locations table
 * Handles countries, states, and cities hierarchy
 */

import { createClient } from "@/lib/supabase/server";

export interface Location {
  id: string;
  name: string;
  type: "country" | "state" | "city";
  parent_id: string | null;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all countries
 */
export async function getCountries(): Promise<Location[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("type", "country")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch countries: ${error.message}`);
  }

  return data as Location[];
}

/**
 * Get all states for a given country
 */
export async function getStatesByCountry(countryId: string): Promise<Location[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("type", "state")
    .eq("parent_id", countryId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch states: ${error.message}`);
  }

  return data as Location[];
}

/**
 * Get all cities for a given state
 */
export async function getCitiesByState(stateId: string): Promise<Location[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("type", "city")
    .eq("parent_id", stateId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cities: ${error.message}`);
  }

  return data as Location[];
}

/**
 * Get location by ID
 */
export async function getLocationById(id: string): Promise<Location | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("locations").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch location: ${error.message}`);
  }

  return data as Location;
}

/**
 * Get default country (USA)
 */
export async function getDefaultCountry(): Promise<Location | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("type", "country")
    .eq("code", "US")
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch default country: ${error.message}`);
  }

  return data as Location;
}
