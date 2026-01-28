/**
 * Cron Job API Route - Transition Completed Events
 *
 * GET /api/cron/transition-events
 * Automatically transitions events from approved_scheduled to completed_awaiting_report
 * when their start date has passed.
 *
 * This endpoint runs hourly and only processes events if there are any that need transition.
 *
 * Authentication: Uses CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from "next/server";
import { transitionCompletedEvents, getEventsNeedingTransition } from "@/lib/services/events/status-transition.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/transition-events
 * Transition completed events (called by cron job hourly)
 * Only processes if there are events that need transition
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json({ success: false, error: "Cron secret not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if there are any events that need transition
    const eventsNeedingTransition = await getEventsNeedingTransition();

    if (eventsNeedingTransition === 0) {
      // No events to transition, return early
      return NextResponse.json({
        success: true,
        transitioned: 0,
        message: "No events need transition at this time",
        timestamp: new Date().toISOString(),
      });
    }

    // Run the transition
    const result = await transitionCompletedEvents();

    return NextResponse.json({
      success: result.success,
      transitioned: result.transitioned,
      errors: result.errors,
      checked: eventsNeedingTransition,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
