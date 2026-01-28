/**
 * Event Cancellation API Route
 *
 * POST /api/events/[id]/cancel
 * Request cancellation for an approved event
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as cancellationService from "@/lib/services/cancellations/cancellation.service";
import { requestCancellationSchema } from "@/lib/validation/cancellations.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/cancel
 * Request cancellation for an event
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
    const validatedInput = requestCancellationSchema.parse({
      eventId: id,
      reason: body.reason,
    });

    // Request cancellation
    const event = await cancellationService.requestCancellation(
      authUser.id,
      validatedInput.eventId,
      validatedInput.reason
    );

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Failed to request cancellation:", error);

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
        error: error instanceof Error ? error.message : "Failed to request cancellation",
      },
      { status: 500 }
    );
  }
}
