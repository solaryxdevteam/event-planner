/**
 * Events API Route
 *
 * GET /api/events - Get events with filters
 * POST /api/events - Create a new event draft
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import * as draftService from "@/lib/services/events/draft.service";
import { createEventSchema } from "@/lib/validation/events.schema";
import type { EventFilterOptions } from "@/lib/data-access/events.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events
 * Get events with filters
 *
 * Query params:
 * - status: string | string[] (comma-separated, optional)
 * - creatorId: string (optional)
 * - venueId: string (optional)
 * - dateFrom: string (ISO date, optional)
 * - dateTo: string (ISO date, optional)
 * - startsAtFrom: string (ISO datetime, optional)
 * - startsAtTo: string (ISO datetime, optional)
 * - search: string (optional)
 * - state: string (optional) - Filter by venue state
 * - page: number (default: 1)
 * - pageSize: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
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

    // Parse filters
    const statusParam = searchParams.get("status");
    const status = statusParam
      ? statusParam.includes(",")
        ? statusParam.split(",").filter(Boolean)
        : statusParam
      : undefined;

    const filters: EventFilterOptions = {
      status,
      creatorId: searchParams.get("creatorId") || undefined,
      venueId: searchParams.get("venueId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      startsAtFrom: searchParams.get("startsAtFrom") || undefined,
      startsAtTo: searchParams.get("startsAtTo") || undefined,
      search: searchParams.get("search") || undefined,
      state: searchParams.get("state") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : undefined,
    };

    // Get events with filters
    const events = await eventService.getEventsForUser(authUser.id, filters);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event draft
 *
 * Body: CreateEventInput (JSON)
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const body = await request.json();

    // Validate input
    const validatedInput = createEventSchema.parse(body);

    // Create draft event
    const event = await draftService.createDraft(authUser.id, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create event:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    // Handle validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create event",
      },
      { status: 500 }
    );
  }
}
