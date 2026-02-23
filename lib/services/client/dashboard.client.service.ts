/**
 * Dashboard Client Service
 *
 * Client-side service for dashboard data.
 * Makes API calls to /api/dashboard endpoints via API client.
 * Does NOT access database or server actions.
 */

import { apiClient } from "./api-client";

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  status: string;
  shortId: string;
}

/**
 * Get events for calendar view (dashboard calendar)
 */
export async function getEventsForCalendar(startDate: Date, endDate: Date): Promise<CalendarEventItem[]> {
  return apiClient.get<CalendarEventItem[]>("/api/dashboard/calendar", {
    params: {
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
    } as Record<string, string | number | boolean | null | undefined>,
  });
}
