/**
 * POST /api/approvals/[eventId]/approve - Approve an event
 *
 * Body:
 *  - comment: string (required - reason for approval)
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as approvalService from "@/lib/services/approvals/approval.service";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireActiveUser();
    const { eventId } = await params;
    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json({ message: "Comment is required for approval" }, { status: 400 });
    }

    const result = await approvalService.approveEvent(user.id, eventId, comment);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error approving event:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to approve event" },
      { status: 500 }
    );
  }
}
