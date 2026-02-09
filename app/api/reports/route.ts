/**
 * Reports List API Route
 *
 * GET /api/reports
 * List approved reports with filters, sort, pagination; and chart data
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as reportService from "@/lib/services/reports/report.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports
 * Query params: page, limit, eventId, venueId, dateFrom, dateTo, sortByNetProfit (asc|desc)
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
    const sortRaw = searchParams.get("sortByNetProfit");
    const sortByNetProfit: "asc" | "desc" | null = sortRaw === "asc" || sortRaw === "desc" ? sortRaw : null;
    const includeChart = searchParams.get("chart") === "true";

    const params = {
      eventId,
      venueId,
      dateFrom,
      dateTo,
      sortByNetProfit,
      page,
      limit,
    };

    const result = await reportService.listApprovedReports(authUser.id, params);
    const chartData = includeChart
      ? await reportService.getReportChartData(authUser.id, { eventId, venueId, dateFrom, dateTo })
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        reports: result.reports,
        pagination: result.pagination,
        ...(chartData !== undefined && { chartData }),
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("GET /api/reports error:", err.message, err instanceof Error ? err.stack : "");
    return NextResponse.json({ success: false, error: err.message || "Failed to load reports" }, { status: 500 });
  }
}
