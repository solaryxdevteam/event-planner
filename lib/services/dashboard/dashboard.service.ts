/**
 * Dashboard Service
 *
 * Business logic for dashboard statistics and data
 */

import { requireActiveUser } from "@/lib/auth/server";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as approvalService from "@/lib/services/approvals/approval.service";
import * as draftService from "@/lib/services/events/draft.service";
import * as venueService from "@/lib/services/venues/venue.service";
import { createClient } from "@/lib/supabase/server";
import { startOfDay, addDays, isAfter, isBefore } from "date-fns";

export interface DashboardStats {
  pendingApprovals: number;
  upcomingEvents: number;
  myDrafts: number;
  numberOfVenues: number;
}

/**
 * Get dashboard statistics for the current user
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const user = await requireActiveUser();
  const userId = user.id;

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  // Fetch all stats in parallel
  const [pendingApprovals, drafts, venues, upcomingEvents] = await Promise.all([
    // Pending approvals count
    approvalService.getPendingApprovals(userId, "event").then((approvals) => approvals.length),
    // My drafts count
    draftService.getDrafts(userId).then((drafts) => drafts.length),
    // Number of active venues
    venueService.getVenues().then((venues) => venues.length),
    // Upcoming events in next 7 days
    getUpcomingEventsCount(userId, subordinateIds, 7),
  ]);

  return {
    pendingApprovals,
    upcomingEvents,
    myDrafts: drafts,
    numberOfVenues: venues,
  };
}

/**
 * Get count of upcoming events in the next N days
 */
async function getUpcomingEventsCount(userId: string, subordinateIds: string[], days: number = 7): Promise<number> {
  const supabase = await createClient();

  const today = startOfDay(new Date());
  const endDate = addDays(today, days);

  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .in("creator_id", subordinateIds)
    .in("status", ["approved_scheduled", "pending_approval", "approved"])
    .gte("starts_at", today.toISOString())
    .lte("starts_at", endDate.toISOString());

  if (error) {
    console.error("Error fetching upcoming events count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get events for calendar view
 */
export async function getEventsForCalendar(startDate: Date, endDate: Date) {
  const user = await requireActiveUser();
  const userId = user.id;

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(userId);

  const supabase = await createClient();

  const { data, error } = (await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, status, short_id")
    .in("creator_id", subordinateIds)
    .gte("starts_at", startDate.toISOString())
    .lte("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true })) as {
    data:
      | {
          id: string;
          title: string;
          starts_at: string;
          ends_at: string | null;
          status: string;
          short_id: string | null;
        }[]
      | null;
    error: Error | null;
  };

  if (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }

  return (data || []).map((event) => ({
    id: event.id,
    title: event.title,
    date: event.starts_at,
    endDate: event.ends_at,
    status: event.status,
    shortId: event.short_id ?? "",
  }));
}
