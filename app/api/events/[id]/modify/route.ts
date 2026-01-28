/**
 * Event Modification Request API Route
 *
 * POST /api/events/[id]/modify - Request modification for an approved event
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import { createEventSchema } from "@/lib/validation/events.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/modify
 * Request modification for an approved event
 *
 * Body: { modificationData: CreateEventInput, changeReason?: string }
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
    const body = await request.json();

    // Validate input
    const { modificationData, changeReason } = body;

    if (!modificationData) {
      return NextResponse.json({ success: false, error: "modificationData is required" }, { status: 400 });
    }

    const validatedModificationData = createEventSchema.parse(modificationData);

    // Request modification
    const event = await eventService.requestModification(authUser.id, id, validatedModificationData, changeReason);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Failed to request modification:", error);

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
        error: error instanceof Error ? error.message : "Failed to request modification",
      },
      { status: 500 }
    );
  }
}
