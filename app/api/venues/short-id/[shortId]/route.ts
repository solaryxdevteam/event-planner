/**
 * Venue by Short ID API Route
 *
 * GET /api/venues/short-id/[shortId] - Get a single venue by short_id
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as venueService from "@/lib/services/venues/venue.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/venues/short-id/[shortId]
 * Get a single venue by short_id
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
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

    const { shortId } = await params;

    // Get venue by short_id
    const venue = await venueService.getVenueByShortId(shortId);

    return NextResponse.json({
      success: true,
      data: venue,
    });
  } catch (error) {
    console.error("Failed to fetch venue:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch venue",
      },
      { status: 500 }
    );
  }
}
