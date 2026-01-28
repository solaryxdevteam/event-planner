/**
 * Get First Draft API Route
 *
 * GET /api/events/drafts/first - Get the first (and only) draft for the current user
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as draftService from "@/lib/services/events/draft.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/drafts/first
 * Get the first draft event for the current user
 * Returns null if no draft exists
 */
export async function GET() {
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

    // Get first draft (should be only one)
    const draft = await draftService.getFirstDraft(authUser.id);

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error("Failed to fetch first draft:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch first draft",
      },
      { status: 500 }
    );
  }
}
