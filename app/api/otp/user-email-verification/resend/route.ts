/**
 * POST /api/otp/user-email-verification/resend
 * Resend verification OTP (2-minute cooldown).
 *
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from "next/server";
import * as userEmailVerificationService from "@/lib/services/user-email-verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const result = await userEmailVerificationService.resendOtp(email);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryAfterSeconds: result.retryAfterSeconds },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification OTP error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to resend code",
      },
      { status: 500 }
    );
  }
}
