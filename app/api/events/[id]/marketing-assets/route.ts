/**
 * PATCH /api/events/[id]/marketing-assets - Update event marketing assets (flyers, videos, budget)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    const { id: eventId } = await params;

    const body = await request.json();

    const marketing_flyers = Array.isArray(body.marketing_flyers) ? body.marketing_flyers : undefined;
    const marketing_videos = Array.isArray(body.marketing_videos) ? body.marketing_videos : undefined;
    const marketing_budget =
      body.marketing_budget !== undefined
        ? body.marketing_budget === null || body.marketing_budget === ""
          ? null
          : Number(body.marketing_budget)
        : undefined;

    const event = await eventService.updateEventMarketingAssets(authUser.id, eventId, {
      marketing_flyers,
      marketing_videos,
      marketing_budget,
    });

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update marketing assets" },
      { status: 500 }
    );
  }
}
