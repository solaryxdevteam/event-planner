/**
 * Event by ID API Route
 *
 * GET /api/events/[id] - Get a single event by ID
 * PUT /api/events/[id] - Update an event (draft only)
 * DELETE /api/events/[id] - Delete an event (draft only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import * as draftService from "@/lib/services/events/draft.service";
import { updateEventSchema } from "@/lib/validation/events.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]
 * Get a single event by ID
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

    // Get event by ID
    const event = await eventService.getEventById(authUser.id, id);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Failed to fetch event:", error);

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
        error: error instanceof Error ? error.message : "Failed to fetch event",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 * Update an event (draft only)
 *
 * Body: UpdateEventInput (JSON)
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
    const validatedInput = updateEventSchema.parse(body);

    // Update draft event
    const event = await draftService.updateDraft(authUser.id, id, validatedInput);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Failed to update event:", error);

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
        error: error instanceof Error ? error.message : "Failed to update event",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event (draft only)
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

    // Delete draft event
    await draftService.deleteDraft(authUser.id, id);

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("Failed to delete event:", error);

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
        error: error instanceof Error ? error.message : "Failed to delete event",
      },
      { status: 500 }
    );
  }
}
