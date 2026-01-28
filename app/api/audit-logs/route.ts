/**
 * Global Audit Logs API Route
 *
 * GET /api/audit-logs
 * Returns paginated audit logs with optional filters for action type, date range, and user.
 * Only non-event-planner roles (curators and above) can access this endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as auditService from "@/lib/services/audit/audit.service";
import type { AuditLogFilterOptions } from "@/lib/data-access/audit-logs.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export async function GET(request: NextRequest) {
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

    // Only non-event-planner roles can access global logs
    const role = authUser.dbUser.role;
    const allowedRoles = ["city_curator", "regional_curator", "lead_curator", "global_director"];
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenError("You do not have permission to view audit logs");
    }

    const { searchParams } = new URL(request.url);

    const page = parseNumber(searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(parseNumber(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);

    const actionType = searchParams.get("actionType") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;

    const offset = (page - 1) * limit;

    const filters: AuditLogFilterOptions = {
      actionType,
      userId,
      dateFrom,
      dateTo,
      limit,
      offset,
    };

    // Fetch logs using service (DAL handles pagination via limit/offset)
    const logs = await auditService.filterLogs(filters);

    // Since the DAL currently does not return total count, we approximate pagination:
    // - hasMore: true if we received "limit" items, false otherwise
    const hasMore = logs.length === limit;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          hasMore,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}
