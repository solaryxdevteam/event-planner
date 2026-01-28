/**
 * Submit Event for Approval API Route
 *
 * POST /api/events/[id]/submit - Submit an event for approval
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/submit
 * Submit an event for approval
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

    // Submit event for approval
    const event = await eventService.submitForApproval(authUser.id, id);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Failed to submit event for approval:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit event for approval",
      },
      { status: 500 }
    );
  }
}
