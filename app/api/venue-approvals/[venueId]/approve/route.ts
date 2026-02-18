/**
 * POST /api/venue-approvals/[venueId]/approve - Approve a venue
 *
 * Body:
 *  - comment: string (required - reason for approval)
 *  - verificationToken: string (required - from OTP verification)
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as venueApprovalService from "@/lib/services/approvals/venue-approval.service";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";

export async function POST(request: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const user = await requireActiveUser();
    const { venueId } = await params;
    const body = await request.json();
    const { comment, verificationToken } = body;

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json({ message: "Comment is required for approval" }, { status: 400 });
    }

    await verificationOtpService.consumeVerificationToken(
      user.id,
      "venue_approval",
      venueId,
      "approve",
      verificationToken
    );

    const result = await venueApprovalService.approveVenue(user.id, venueId, comment);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error approving venue:", error);
    const message = error instanceof Error ? error.message : "Failed to approve venue";
    const status = message.includes("Verification") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
