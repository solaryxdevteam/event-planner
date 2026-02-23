/**
 * POST /api/otp/approval/verify
 * Verify OTP and get one-time token for approve/reject API.
 *
 * Body: { contextType, contextId, action, code: string }
 * Returns: { success: true, verificationToken: string }
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
