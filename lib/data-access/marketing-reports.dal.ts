/**
 * Marketing Reports Data Access Layer
 */

import { createClient } from "@/lib/supabase/server";
import type { MarketingReport, MarketingReportWithSubmitter } from "@/lib/types/database.types";
import type { Database } from "@/lib/types/database.types";

type MarketingReportInsert = Database["public"]["Tables"]["marketing_reports"]["Insert"];
type MarketingReportUpdate = Database["public"]["Tables"]["marketing_reports"]["Update"];

export async function findAllByEventId(eventId: string): Promise<MarketingReportWithSubmitter[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_reports")
    .select("*, submitter:users!submitted_by(first_name, last_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch marketing reports: ${error.message}`);
  }

  const rows = (data || []) as (MarketingReport & {
    submitter?: { first_name: string; last_name: string | null } | null;
  })[];
  return rows.map((row) => {
    const { submitter, ...report } = row;
    const submitted_by_name =
      submitter != null ? [submitter.first_name, submitter.last_name].filter(Boolean).join(" ").trim() || null : null;
    return { ...report, submitted_by_name };
  });
}

export async function findPendingByEventId(eventId: string): Promise<MarketingReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_reports")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch pending marketing report: ${error.message}`);
  }

  return data as MarketingReport | null;
}

/**
 * Get the approved marketing report for an event (if any). Used to attach marketing assets to event for display.
 */
export async function findApprovedByEventId(eventId: string): Promise<MarketingReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_reports")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch approved marketing report: ${error.message}`);
  }

  return data as MarketingReport | null;
}

export async function insert(row: MarketingReportInsert): Promise<MarketingReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_reports")
    // @ts-expect-error - Supabase type inference
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create marketing report: ${error.message}`);
  }

  return data as MarketingReport;
}

export async function updateStatus(id: string, status: "approved" | "rejected"): Promise<MarketingReport> {
  const supabase = await createClient();

  const updates: MarketingReportUpdate = { status, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("marketing_reports")
    // @ts-expect-error - Supabase type inference
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update marketing report: ${error.message}`);
  }

  return data as MarketingReport;
}

/**
 * Get event IDs that have at least one approved marketing report.
 * Used to filter "events needing marketing report" (exclude these).
 */
export async function findEventIdsWithApprovedReport(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("marketing_reports").select("event_id").eq("status", "approved");

  if (error) {
    throw new Error(`Failed to fetch event IDs with approved marketing report: ${error.message}`);
  }

  const ids = [...new Set((data || []).map((row: { event_id: string }) => row.event_id))];
  return ids;
}
