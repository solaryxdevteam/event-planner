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
 * Find report by event ID (returns the approved report if exists, otherwise the most recent)
 * @deprecated Use findAllByEventId to get all reports
 */
export async function findByEventId(eventId: string): Promise<Report | null> {
  const supabase = await createClient();

  // First try to get approved report
  const { data: approvedReport, error: approvedError } = await supabase
    .from("reports")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "approved")
    .single();

  if (!approvedError && approvedReport) {
    return approvedReport as Report;
  }

  // If no approved report, get the most recent report
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch report: ${error.message}`);
  }

  return data ? (data as Report) : null;
}

/**
 * Find all reports for an event, ordered by created_at descending (newest first)
 */
export async function findAllByEventId(eventId: string): Promise<Report[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reports: ${error.message}`);
  }

  return (data || []) as Report[];
}

/**
 * Find report by ID
 */
export async function findById(reportId: string): Promise<Report | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("reports").select("*").eq("id", reportId).single();

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
    // Provide a clearer error message for constraint violations
    if (error.message?.includes("one_report_per_event") || error.code === "23505") {
      throw new Error(
        "A report already exists for this event. Please delete the existing report before creating a new one, or ensure migration 021 has been applied."
      );
    }
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

/**
 * Approved report row with event and venue info for list/chart
 */
export interface ApprovedReportRow extends Report {
  event_title: string;
  event_short_id: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_short_id: string | null;
}

export interface ListApprovedReportsParams {
  subordinateUserIds: string[];
  eventId?: string | null;
  venueId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  userId?: string | null;
  djId?: string | null;
  page: number;
  limit: number;
}

export interface ListApprovedReportsResult {
  reports: ApprovedReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * List approved reports with event and venue info, filters, sort, pagination
 */
export async function listApproved(params: ListApprovedReportsParams): Promise<ListApprovedReportsResult> {
  const supabase = await createClient();
  const { subordinateUserIds, eventId, venueId, dateFrom, dateTo, userId, djId, page, limit } = params;

  // Get event IDs the user can see (creator in subordinateUserIds, optional filters)
  let eventsQuery = supabase.from("events").select("id").in("creator_id", subordinateUserIds);
  if (venueId) {
    eventsQuery = eventsQuery.eq("venue_id", venueId);
  }
  if (eventId) {
    eventsQuery = eventsQuery.eq("id", eventId);
  }
  if (userId) {
    eventsQuery = eventsQuery.eq("creator_id", userId);
  }
  if (djId) {
    eventsQuery = eventsQuery.eq("dj_id", djId);
  }
  const { data: eventRows } = await eventsQuery;
  const allowedEventIds = (eventRows || []).map((r: { id: string }) => r.id);
  if (allowedEventIds.length === 0) {
    return {
      reports: [],
      pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
    };
  }

  let query = supabase
    .from("reports")
    .select(
      `
      *,
      event:events!reports_event_id_fkey (
        id,
        short_id,
        title,
        venue_id,
        venue:venues!events_venue_id_fkey (
          id,
          short_id,
          name
        )
      )
    `,
      { count: "exact" }
    )
    .eq("status", "approved")
    .in("event_id", allowedEventIds);

  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  query = query.order("created_at", { ascending: false });

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list approved reports: ${error.message}`);
  }

  const rows = (data || []) as Array<
    Report & {
      event: {
        id: string;
        short_id: string;
        title: string;
        venue_id: string | null;
        venue: { id: string; short_id: string | null; name: string } | null;
      } | null;
    }
  >;

  const reports: ApprovedReportRow[] = rows.map((row) => ({
    ...row,
    event_title: row.event?.title ?? "",
    event_short_id: row.event?.short_id ?? "",
    venue_id: row.event?.venue_id ?? null,
    venue_name: row.event?.venue?.name ?? null,
    venue_short_id: row.event?.venue?.short_id ?? null,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    reports,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

export interface ReportChartDataPoint {
  date: string; // YYYY-MM-DD
  table_sales: number;
  ticket_sales: number;
  bar_sales: number;
  event_count: number;
}

export interface GetReportChartParams {
  subordinateUserIds: string[];
  eventId?: string | null;
  venueId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  userId?: string | null;
  djId?: string | null;
}

/**
 * Get aggregated report data by date for chart (table/ticket/bar sales sums, event count per date)
 */
export async function getChartData(params: GetReportChartParams): Promise<ReportChartDataPoint[]> {
  const supabase = await createClient();
  const { subordinateUserIds, eventId, venueId, dateFrom, dateTo, userId, djId } = params;

  let query = supabase
    .from("reports")
    .select(
      `
      created_at,
      total_table_sales,
      total_ticket_sales,
      total_bar_sales,
      event_id,
      event:events!reports_event_id_fkey (
        creator_id,
        venue_id,
        dj_id
      )
    `
    )
    .eq("status", "approved");

  if (eventId) {
    query = query.eq("event_id", eventId);
  }
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get report chart data: ${error.message}`);
  }

  const rows = (data || []) as Array<{
    created_at: string;
    total_table_sales: number | null;
    total_ticket_sales: number | null;
    total_bar_sales: number | null;
    event_id: string;
    event: { creator_id: string; venue_id: string | null; dj_id: string | null } | null;
  }>;

  // Filter by subordinateUserIds (event.creator_id) and optionally venueId, userId, djId in app
  let filtered = rows.filter((r) => r.event && subordinateUserIds.includes(r.event.creator_id));
  if (venueId) {
    filtered = filtered.filter((r) => r.event?.venue_id === venueId);
  }
  if (userId) {
    filtered = filtered.filter((r) => r.event?.creator_id === userId);
  }
  if (djId) {
    filtered = filtered.filter((r) => r.event?.dj_id === djId);
  }

  // Aggregate by date (YYYY-MM-DD)
  const byDate = new Map<
    string,
    { table_sales: number; ticket_sales: number; bar_sales: number; event_count: number }
  >();
  for (const r of filtered) {
    const date = r.created_at.slice(0, 10);
    const current = byDate.get(date) ?? {
      table_sales: 0,
      ticket_sales: 0,
      bar_sales: 0,
      event_count: 0,
    };
    current.table_sales += Number(r.total_table_sales) || 0;
    current.ticket_sales += Number(r.total_ticket_sales) || 0;
    current.bar_sales += Number(r.total_bar_sales) || 0;
    current.event_count += 1;
    byDate.set(date, current);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  return sortedDates.map((date) => {
    const agg = byDate.get(date)!;
    return {
      date,
      table_sales: agg.table_sales,
      ticket_sales: agg.ticket_sales,
      bar_sales: agg.bar_sales,
      event_count: agg.event_count,
    };
  });
}
