/**
 * Event Report API Route
 *
 * POST /api/events/[id]/report
 * Submit a post-event report
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireActiveUser } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as reportService from "@/lib/services/reports/report.service";
import { submitReportSchema } from "@/lib/validation/reports.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/report
 * Submit a report for an event.
 * Accepts either application/json (reels_urls, media_urls from upload-on-select) or multipart/form-data (file parts).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let authUser;
    try {
      authUser = await requireActiveUser();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          { success: false, error: "Your account must be active to submit reports." },
          { status: 403 }
        );
      }
      throw error;
    }

    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";

    let payload: {
      attendance_count: number;
      total_ticket_sales: number | null;
      total_bar_sales: number | null;
      total_table_sales: number | null;
      detailed_report: string;
      incidents: string | null;
      feedback?: string | null;
      external_links: unknown;
      reelsUrls?: string[];
      mediaUrls?: string[];
      reelsFiles?: (File | Blob)[];
      mediaFiles?: (File | Blob)[];
    };

    if (contentType.includes("application/json")) {
      const body = await request.json();
      payload = {
        attendance_count: body.attendance_count,
        total_ticket_sales: body.total_ticket_sales ?? null,
        total_bar_sales: body.total_bar_sales ?? null,
        total_table_sales: body.total_table_sales ?? null,
        detailed_report: body.detailed_report ?? "",
        incidents: body.incidents ?? null,
        feedback: body.feedback ?? null,
        external_links: body.external_links ?? null,
        reelsUrls: Array.isArray(body.reels_urls) ? body.reels_urls : undefined,
        mediaUrls: Array.isArray(body.media_urls) ? body.media_urls : undefined,
      };
    } else {
      const formData = await request.formData();
      const attendance_count = parseInt(formData.get("attendance_count") as string, 10);
      const total_ticket_sales_raw = formData.get("total_ticket_sales") as string | null;
      const total_bar_sales_raw = formData.get("total_bar_sales") as string | null;
      const total_table_sales_raw = formData.get("total_table_sales") as string | null;
      const detailed_report = formData.get("detailed_report") as string;
      const incidents = (formData.get("incidents") as string) || null;
      const feedback = formData.get("feedback") as string | null;
      const external_links_json = formData.get("external_links") as string | null;

      const total_ticket_sales =
        total_ticket_sales_raw != null && total_ticket_sales_raw !== "" ? parseFloat(total_ticket_sales_raw) : null;
      const total_bar_sales =
        total_bar_sales_raw != null && total_bar_sales_raw !== "" ? parseFloat(total_bar_sales_raw) : null;
      const total_table_sales =
        total_table_sales_raw != null && total_table_sales_raw !== "" ? parseFloat(total_table_sales_raw) : null;

      let external_links: unknown = null;
      if (external_links_json) {
        try {
          external_links = JSON.parse(external_links_json);
        } catch {
          external_links = null;
        }
      }

      const reelsFiles: (File | Blob)[] = [];
      const mediaFiles: (File | Blob)[] = [];
      for (const [key, value] of formData.entries()) {
        const isFilePart = value instanceof File;
        if (isFilePart) {
          if (key.startsWith("reels_")) reelsFiles.push(value as File | Blob);
          else if (key.startsWith("media_")) mediaFiles.push(value as File | Blob);
        }
      }

      payload = {
        attendance_count,
        total_ticket_sales: Number.isFinite(total_ticket_sales) ? total_ticket_sales : null,
        total_bar_sales: Number.isFinite(total_bar_sales) ? total_bar_sales : null,
        total_table_sales: Number.isFinite(total_table_sales) ? total_table_sales : null,
        detailed_report: detailed_report || "",
        incidents,
        feedback: feedback ?? null,
        external_links,
        reelsFiles,
        mediaFiles,
      };
    }

    const validatedInput = submitReportSchema.parse({
      eventId: id,
      attendance_count: payload.attendance_count,
      total_ticket_sales: payload.total_ticket_sales,
      total_bar_sales: payload.total_bar_sales,
      total_table_sales: payload.total_table_sales,
      detailed_report: payload.detailed_report,
      incidents: payload.incidents,
      feedback: payload.feedback,
      external_links: payload.external_links,
    });

    const report = await reportService.submitReport(authUser.id, validatedInput.eventId, {
      attendance_count: validatedInput.attendance_count,
      total_ticket_sales: validatedInput.total_ticket_sales ?? null,
      total_bar_sales: validatedInput.total_bar_sales ?? null,
      total_table_sales: validatedInput.total_table_sales ?? null,
      detailed_report: validatedInput.detailed_report,
      incidents: validatedInput.incidents ?? null,
      feedback: validatedInput.feedback,
      external_links: validatedInput.external_links,
      reelsUrls: payload.reelsUrls,
      mediaUrls: payload.mediaUrls,
      reelsFiles: payload.reelsFiles,
      mediaFiles: payload.mediaFiles,
    });

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
