/**
 * POST /api/approvals/[eventId]/approve - Approve an event
 *
 * Body:
 *  - comment: string (required - reason for approval)
 *  - verificationToken: string (required - from OTP verification)
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as approvalService from "@/lib/services/approvals/approval.service";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const user = await requireActiveUser();
    const { eventId } = await params;
    const body = await request.json();
    const { comment, verificationToken } = body;

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json({ message: "Comment is required for approval" }, { status: 400 });
    }

    await verificationOtpService.consumeVerificationToken(
      user.id,
      "event_approval",
      eventId,
      "approve",
      verificationToken
    );

    const result = await approvalService.approveEvent(user.id, eventId, comment);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error approving event:", error);
    const message = error instanceof Error ? error.message : "Failed to approve event";
    const status = message.includes("Verification") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
