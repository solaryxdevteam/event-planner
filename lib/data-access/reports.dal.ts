/**
 * Reports Data Access Layer
 *
 * Handles database operations for event reports
 */

import { createClient } from "@/lib/supabase/server";
import type { Report } from "@/lib/types/database.types";
import type { Database } from "@/lib/types/database.types";

type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

/**
 * Find report by event ID
 */
export async function findByEventId(eventId: string): Promise<Report | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("reports").select("*").eq("event_id", eventId).single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  return data as Report;
}

/**
 * Insert a new report
 */
export async function insert(report: ReportInsert): Promise<Report> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(report)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return data as Report;
}

/**
 * Update a report
 */
export async function update(id: string, updates: ReportUpdate): Promise<Report> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    // @ts-expect-error - Supabase type inference issue with Database types
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`);
  }

  return data as Report;
}

/**
 * Delete a report (for resubmission)
 */
export async function deleteReport(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`);
  }
}
