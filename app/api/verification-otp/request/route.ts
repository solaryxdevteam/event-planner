/**
 * POST /api/verification-otp/request - Request OTP for approval verification
 *
 * Body: { contextType: "event_approval" | "venue_approval", contextId: string, action: "approve" | "reject" }
 * Sends OTP to current user's email. Resend allowed after 2 minutes.
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as verificationOtpService from "@/lib/services/verification-otp/verification-otp.service";
import type { VerificationOtpContextType, VerificationOtpAction } from "@/lib/types/database.types";

const CONTEXT_TYPES: VerificationOtpContextType[] = [
  "event_approval",
  "venue_approval",
  "venue_create",
  "event_create",
];
const ACTIONS: VerificationOtpAction[] = ["approve", "reject", "create"];

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();
    const body = await request.json();
    const { contextType, contextId, action } = body;

    if (
      !CONTEXT_TYPES.includes(contextType) ||
      !contextId ||
      typeof contextId !== "string" ||
      !ACTIONS.includes(action)
    ) {
      return NextResponse.json(
        { message: "Invalid request. contextType, contextId, and action are required." },
        { status: 400 }
      );
    }

    const result = await verificationOtpService.requestOtp(user.id, user.email, contextType, contextId.trim(), action);

    return NextResponse.json({
      success: true,
      expiresAt: result.expiresAt.toISOString(),
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send verification code.";
    const status = message.includes("wait") ? 429 : 500;
    return NextResponse.json({ message }, { status });
  }
}
