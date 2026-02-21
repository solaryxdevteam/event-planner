/**
 * GET /api/events/[id]/marketing-reports - List marketing reports for an event
 * POST /api/events/[id]/marketing-reports - Submit a marketing report (marketing_manager only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import * as marketingReportService from "@/lib/services/marketing/marketing-report.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    const { id: eventId } = await params;

    await eventService.getEventById(authUser.id, eventId);

    const reports = await marketingReportService.getMarketingReportsByEventId(eventId);

    return NextResponse.json({
      success: true,
      data: reports,
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
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch marketing reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    const { id: eventId } = await params;

    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes : null;
    const marketing_flyers = Array.isArray(body.marketing_flyers) ? body.marketing_flyers : undefined;
    const marketing_videos = Array.isArray(body.marketing_videos) ? body.marketing_videos : undefined;
    const marketing_budget =
      body.marketing_budget !== undefined
        ? body.marketing_budget === null || body.marketing_budget === ""
          ? null
          : Number(body.marketing_budget)
        : undefined;

    const report = await marketingReportService.submitMarketingReport(authUser.id, eventId, {
      notes,
      marketing_flyers,
      marketing_videos,
      marketing_budget,
    });

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 201 }
    );
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to submit marketing report" },
      { status: 500 }
    );
  }
}
