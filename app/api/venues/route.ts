/**
 * Venues API Route
 *
 * GET /api/venues - Get venues with filters and pagination
 * POST /api/venues - Create a new venue
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as venueService from "@/lib/services/venues/venue.service";
import { createVenueSchema } from "@/lib/validation/venues.schema";
import type { VenueFilterOptions } from "@/lib/data-access/venues.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/venues
 * Get venues with filters and pagination
 *
 * Query params:
 * - search: string (optional)
 * - state: string | null (optional, "all" means null)
 * - status: "all" | "active" | "banned" (default: "all")
 * - specs: string[] (comma-separated, optional)
 * - dateFrom: string (ISO date, optional)
 * - dateTo: string (ISO date, optional)
 * - standingMin: number (optional)
 * - standingMax: number (optional)
 * - seatedMin: number (optional)
 * - seatedMax: number (optional)
 * - page: number (default: 1)
 * - pageSize: number (default: 9)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: VenueFilterOptions = {
      search: searchParams.get("search") || undefined,
      state: searchParams.get("state") === "all" || !searchParams.get("state") ? null : searchParams.get("state"),
      status: (searchParams.get("status") || "all") as "all" | "active" | "banned",
      specs: searchParams.get("specs") ? searchParams.get("specs")!.split(",").filter(Boolean) : undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      standingMin: searchParams.get("standingMin") ? parseInt(searchParams.get("standingMin")!, 10) : undefined,
      standingMax: searchParams.get("standingMax") ? parseInt(searchParams.get("standingMax")!, 10) : undefined,
      seatedMin: searchParams.get("seatedMin") ? parseInt(searchParams.get("seatedMin")!, 10) : undefined,
      seatedMax: searchParams.get("seatedMax") ? parseInt(searchParams.get("seatedMax")!, 10) : undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "9", 10),
    };

    // Get venues with filters
    const result = await venueService.getVenuesWithFilters(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch venues:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch venues",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venues
 * Create a new venue
 *
 * Body: CreateVenueInput (JSON)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate input
    const validatedInput = createVenueSchema.parse(body);

    // Create venue
    const result = await venueService.createVenue(validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create venue:", error);

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
        error: error instanceof Error ? error.message : "Failed to create venue",
      },
      { status: 500 }
    );
  }
}
