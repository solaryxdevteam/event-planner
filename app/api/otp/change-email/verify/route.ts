/**
 * POST /api/otp/change-email/verify
 * Verify OTP and apply email change (Supabase Auth + users table).
 * Non–Global Director only.
 *
 * Body: { newEmail: string, code: string }
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
    const code = typeof body.code === "string" ? body.code : "";

    if (!newEmail || !code) {
      return NextResponse.json({ message: "New email and verification code are required." }, { status: 400 });
    }

    await changeEmailService.verifyAndApplyChangeEmail(user.id, newEmail, code);

    return NextResponse.json({
      success: true,
      message: "Your email has been updated. You can sign in with your new email next time.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
