/**
 * Manual Event Transition API Route
 *
 * POST /api/events/[id]/transition
 * Manually transition an event from approved_scheduled to completed_awaiting_report
 *
 * Requires: Global Director role (or appropriate admin role)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import { manuallyTransitionEvent } from "@/lib/services/events/status-transition.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/transition
 * Manually transition an event to completed_awaiting_report
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Require Global Director role for manual transitions
    let authUser;
    try {
      authUser = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          {
            success: false,
            error: "Only Global Directors can manually transition events",
          },
          { status: 403 }
        );
      }
      throw error;
    }

    const { id } = await params;

    // Transition the event
    const result = await manuallyTransitionEvent(id, authUser.id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to transition event",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event transitioned successfully",
    });
  } catch (error) {
    console.error("Failed to transition event:", error);

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
        error: error instanceof Error ? error.message : "Failed to transition event",
      },
      { status: 500 }
    );
  }
}
