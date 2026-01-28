/**
 * Event Audit Logs API Route
 *
 * GET /api/events/[id]/audit-logs
 * Get audit log history for an event (authorized users only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as auditService from "@/lib/services/audit/audit.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/audit-logs
 * Get audit logs for an event
 * Only authorized users (event creator, approvers, or users in hierarchy) can view
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

    // Get subordinate user IDs for authorization
    const subordinateIds = await getSubordinateUserIds(authUser.id);

    // Verify user has access to this event
    const event = await eventDAL.findById(id, subordinateIds, false);
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found or access denied" }, { status: 404 });
    }

    // Get audit logs for the event
    const auditLogs = await auditService.getEventAuditLog(id);

    return NextResponse.json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);

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
        error: error instanceof Error ? error.message : "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}
