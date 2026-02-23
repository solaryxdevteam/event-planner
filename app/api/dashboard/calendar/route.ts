/**
 * Dashboard Calendar API Route
 *
 * GET /api/dashboard/calendar - Get events for calendar view (dateFrom, dateTo query params)
 */

import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as dashboardService from "@/lib/services/dashboard/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/calendar
 * Query params: dateFrom (ISO string), dateTo (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, error: "dateFrom and dateTo query parameters are required" },
        { status: 400 }
      );
    }
    const events = await dashboardService.getEventsForCalendar(new Date(dateFrom), new Date(dateTo));
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error("Failed to fetch dashboard calendar:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
