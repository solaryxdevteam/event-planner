/**
 * POST /api/otp/change-email/request
 * Request OTP to change email (non–Global Director only).
 * Sends OTP to the new email address.
 *
 * Body: { newEmail: string }
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as changeEmailService from "@/lib/services/profile/change-email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();

    const body = await request.json();
    const newEmail = typeof body.newEmail === "string" ? body.newEmail.trim() : "";

    if (!newEmail) {
      return NextResponse.json({ message: "New email is required." }, { status: 400 });
    }

    const result = await changeEmailService.requestChangeEmailOtp(user.id, user.email, newEmail);

    return NextResponse.json({
      success: true,
      expiresAt: result.expiresAt.toISOString(),
      message: "Verification code sent to your new email address.",
      ...(result.otpCode != null && { otpCode: result.otpCode }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send verification code.";
    const status = message.includes("wait") ? 429 : 400;
    return NextResponse.json({ message }, { status });
  }
}
