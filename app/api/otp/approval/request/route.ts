/**
 * POST /api/otp/approval/request
 * Request OTP for approval verification (approve/reject actions).
 * Sends OTP to current user's email. Resend allowed after 2 minutes.
 *
 * Body: { contextType, contextId, action }
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
  "password_change",
];
const ACTIONS: VerificationOtpAction[] = ["approve", "reject", "create", "change"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      ...(result.otpCode != null && { otpCode: result.otpCode }),
    });
  } catch (error) {
    const err = error as { message?: string };
    const message =
      (error instanceof Error ? error.message : null) ||
      (typeof err?.message === "string" ? err.message : null) ||
      "Failed to send verification code.";
    const status = message.includes("wait") ? 429 : 500;
    if (status === 500 && process.env.NODE_ENV === "development") {
      console.error("[otp/approval/request]", error);
    }
    return NextResponse.json({ message }, { status });
  }
}
