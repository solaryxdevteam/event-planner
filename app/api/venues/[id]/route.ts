/**
 * Venue by ID API Route
 *
 * GET /api/venues/[id] - Get a single venue by ID
 * PUT /api/venues/[id] - Update a venue
 * DELETE /api/venues/[id] - Delete (soft delete) a venue
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as venueService from "@/lib/services/venues/venue.service";
import { updateVenueSchema } from "@/lib/validation/venues.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/venues/[id]
 * Get a single venue by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get venue by ID
    const venue = await venueService.getVenueById(id);

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

/**
 * PUT /api/venues/[id]
 * Update a venue
 *
 * Body: UpdateVenueInput (JSON)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json();

    // Validate input
    const validatedInput = updateVenueSchema.parse(body);

    // Update venue
    const venue = await venueService.updateVenue(id, validatedInput);

    return NextResponse.json({
      success: true,
      data: venue,
    });
  } catch (error) {
    console.error("Failed to update venue:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
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
        error: error instanceof Error ? error.message : "Failed to update venue",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venues/[id]
 * Delete (soft delete) a venue
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Delete venue
    await venueService.deleteVenue(id);

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error("Failed to delete venue:", error);

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
        error: error instanceof Error ? error.message : "Failed to delete venue",
      },
      { status: 500 }
    );
  }
}
