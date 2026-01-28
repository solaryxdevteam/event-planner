/**
 * GET /api/approvals - Get pending approvals for current user
 *
 * Query params:
 *  - type: ApprovalType (event, modification, cancellation, report)
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as approvalService from "@/lib/services/approvals/approval.service";
import type { ApprovalType } from "@/lib/types/database.types";

export async function GET(request: Request) {
  try {
    const user = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const approvalType = searchParams.get("type") as ApprovalType | null;

    const approvals = await approvalService.getPendingApprovals(user.id, approvalType || "event");

    return NextResponse.json(approvals);
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
