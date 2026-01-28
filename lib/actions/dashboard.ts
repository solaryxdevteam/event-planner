/**
 * Dashboard Actions
 *
 * Server actions for dashboard data
 */

"use server";

import * as dashboardService from "@/lib/services/dashboard/dashboard.service";
import type { DashboardStats } from "@/lib/services/dashboard/dashboard.service";

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return dashboardService.getDashboardStats();
}

/**
 * Get events for calendar
 */
export async function getEventsForCalendar(startDate: Date, endDate: Date) {
  return dashboardService.getEventsForCalendar(startDate, endDate);
}
