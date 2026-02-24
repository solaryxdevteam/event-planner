/**
 * Reports List API Route
 *
 * GET /api/reports
 * List approved reports with filters, sort, pagination; and chart data
 */

import { NextRequest, NextResponse } from "next/server";
import { format, subYears } from "date-fns";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as reportService from "@/lib/services/reports/report.service";
import { logErrorToFile } from "@/lib/utils/file-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports
 * Query params: page, limit, eventId, venueId, dateFrom, dateTo, userId, djId
 * Returns: { data: { reports, pagination }, chartData?: ReportChartDataPoint[] }
 * If chart=true, also returns chartData for the same filters.
 */
export async function GET(request: NextRequest) {
  try {
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
    const eventId = searchParams.get("eventId") || null;
    const venueId = searchParams.get("venueId") || null;
    const dateFrom = searchParams.get("dateFrom") || null;
    const dateTo = searchParams.get("dateTo") || null;
    const userId = searchParams.get("userId") || null;
    const djId = searchParams.get("djId") || null;
    const includeChart = searchParams.get("chart") === "true";

    const params = {
      eventId,
      venueId,
      dateFrom,
      dateTo,
      userId,
      djId,
      page,
      limit,
    };

    const result = await reportService.listApprovedReports(authUser.id, params);
    let chartData: Awaited<ReturnType<typeof reportService.getReportChartData>> | undefined;
    let chartDataPriorYear: Awaited<ReturnType<typeof reportService.getReportChartData>> | undefined;

    if (includeChart) {
      chartData = await reportService.getReportChartData(authUser.id, {
        eventId,
        venueId,
        dateFrom,
        dateTo,
        userId,
        djId,
      });
      // Same date range last year for growth comparison
      if (dateFrom && dateTo) {
        const from = new Date(dateFrom + "T12:00:00");
        const to = new Date(dateTo + "T12:00:00");
        const priorYearFrom = format(subYears(from, 1), "yyyy-MM-dd");
        const priorYearTo = format(subYears(to, 1), "yyyy-MM-dd");
        chartDataPriorYear = await reportService.getReportChartData(authUser.id, {
          eventId,
          venueId,
          dateFrom: priorYearFrom,
          dateTo: priorYearTo,
          userId,
          djId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        reports: result.reports,
        pagination: result.pagination,
        ...(chartData !== undefined && { chartData }),
        ...(chartDataPriorYear !== undefined && { chartDataPriorYear }),
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logErrorToFile("GET /api/reports", error);
    console.error("GET /api/reports error:", err.message, err instanceof Error ? err.stack : "");
    return NextResponse.json({ success: false, error: err.message || "Failed to load reports" }, { status: 500 });
  }
}
