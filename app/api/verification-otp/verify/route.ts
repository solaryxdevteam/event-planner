/**
 * POST /api/verification-otp/verify - Verify OTP and get one-time token
 *
 * Body: { contextType, contextId, action, code: string }
 * Returns { verificationToken } to be sent with approve/reject API.
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
    const { contextType, contextId, action, code } = body;

    if (
      !CONTEXT_TYPES.includes(contextType) ||
      !contextId ||
      typeof contextId !== "string" ||
      !ACTIONS.includes(action) ||
      !code ||
      typeof code !== "string"
    ) {
      return NextResponse.json(
        { message: "Invalid request. contextType, contextId, action, and code are required." },
        { status: 400 }
      );
    }

    const result = await verificationOtpService.verifyOtp(user.id, contextType, contextId.trim(), action, code.trim());

    return NextResponse.json({
      success: true,
      verificationToken: result.verificationToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
