/**
 * Check Cancellation Permission API Route
 *
 * GET /api/events/[id]/can-cancel
 * Check if current user can request cancellation for an event
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as cancellationService from "@/lib/services/cancellations/cancellation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/can-cancel
 * Check if user can request cancellation
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

    // Check if user can request cancellation
    const canRequest = await cancellationService.canRequestCancellation(authUser.id, id);

    return NextResponse.json({
      success: true,
      data: { canRequest },
    });
  } catch (error) {
    console.error("Failed to check cancellation permission:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check permission",
      },
      { status: 500 }
    );
  }
}
