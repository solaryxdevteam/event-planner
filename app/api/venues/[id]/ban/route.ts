/**
 * Ban Venue API Route
 *
 * POST /api/venues/[id]/ban - Ban a venue (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as venueService from "@/lib/services/venues/venue.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/venues/[id]/ban
 * Ban a venue (Global Director only)
 *
 * Body: { reason?: string } (optional)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || undefined;

    // Ban venue
    await venueService.banVenue(id, reason);

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error("Failed to ban venue:", error);

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
        error: error instanceof Error ? error.message : "Failed to ban venue",
      },
      { status: 500 }
    );
  }
}
