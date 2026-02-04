/**
 * Venue Upcoming Events API Route
 *
 * GET /api/venues/[id]/upcoming-events - Check if venue has upcoming events
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as eventDAL from "@/lib/data-access/events.dal";

/**
 * GET /api/venues/[id]/upcoming-events
 * Check if venue has upcoming events
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Require authentication
    try {
      await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const resolvedParams = await params;
    const venueId = resolvedParams.id;

    if (!venueId) {
      return NextResponse.json({ success: false, error: "Venue ID is required" }, { status: 400 });
    }

    // Check if venue has upcoming events
    const hasUpcoming = await eventDAL.hasUpcomingEvents(venueId);

    return NextResponse.json({
      success: true,
      data: { hasUpcomingEvents: hasUpcoming },
    });
  } catch (error) {
    console.error("Failed to check upcoming events:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check upcoming events",
      },
      { status: 500 }
    );
  }
}
