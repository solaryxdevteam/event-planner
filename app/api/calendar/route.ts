/**
 * Calendar API Route
 *
 * GET /api/calendar - Get all events for calendar view
 * Returns events with relations (venue, DJ, creator) for the calendar display
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);

    const filters: Record<string, string | string[]> = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status.includes(",") ? status.split(",") : status;
    } else {
      filters.status = ["approved_scheduled", "in_review", "completed_awaiting_report", "completed_archived"];
    }

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) filters.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) filters.dateTo = dateTo;

    const search = searchParams.get("search");
    if (search) filters.search = search;

    const events = await eventService.getEventsForUser(authUser.id, filters);

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("[Calendar API] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
