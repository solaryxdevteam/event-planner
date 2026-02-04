/**
 * Event Report API Route
 *
 * POST /api/events/[id]/report
 * Submit a post-event report
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as reportService from "@/lib/services/reports/report.service";
import { submitReportSchema } from "@/lib/validation/reports.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/report
 * Submit a report for an event
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
    const formData = await request.formData();

    // Extract form data
    const attendance_count = parseInt(formData.get("attendance_count") as string, 10);
    const summary = formData.get("summary") as string;
    const feedback = formData.get("feedback") as string | null;
    const external_links_json = formData.get("external_links") as string | null;
    const net_profit_raw = formData.get("net_profit") as string | null;
    const net_profit = net_profit_raw !== null && net_profit_raw !== "" ? parseFloat(net_profit_raw) : null;

    // Parse external links
    let external_links = null;
    if (external_links_json) {
      try {
        external_links = JSON.parse(external_links_json);
      } catch {
        external_links = null;
      }
    }

    // Extract media files
    const mediaFiles: File[] = [];
    const fileEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith("media_"));
    for (const [, file] of fileEntries) {
      if (file instanceof File) {
        mediaFiles.push(file);
      }
    }

    // Validate input
    const validatedInput = submitReportSchema.parse({
      eventId: id,
      attendance_count,
      summary,
      feedback,
      external_links,
      net_profit: Number.isFinite(net_profit) ? net_profit : null,
    });

    // Submit report
    const report = await reportService.submitReport(
      authUser.id,
      validatedInput.eventId,
      {
        attendance_count: validatedInput.attendance_count,
        summary: validatedInput.summary,
        feedback: validatedInput.feedback,
        external_links: validatedInput.external_links,
        net_profit: validatedInput.net_profit ?? null,
      },
      mediaFiles.length > 0 ? mediaFiles : undefined
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Failed to submit report:", error);

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
        error: error instanceof Error ? error.message : "Failed to submit report",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/report
 * Get reports for an event
 * Query param: all=true to get all reports, otherwise returns single report (approved or most recent)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Require authentication
    try {
      await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    if (getAll) {
      // Get all reports for the event
      const reports = await reportService.getAllReportsByEventId(id);
      return NextResponse.json({
        success: true,
        data: reports,
      });
    } else {
      // Get single report (backward compatibility)
      const report = await reportService.getReportByEventId(id);
      return NextResponse.json({
        success: true,
        data: report,
      });
    }
  } catch (error) {
    console.error("Failed to fetch report:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch report",
      },
      { status: 500 }
    );
  }
}
