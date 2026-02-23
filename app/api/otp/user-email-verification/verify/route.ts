/**
 * POST /api/otp/user-email-verification/verify
 * Verify OTP after registration, activate user, and return magic link for auto-login.
 *
 * Body: { email: string, otp: string }
 * Returns: { success: true, loginUrl?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import * as userEmailVerificationService from "@/lib/services/user-email-verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_REDIRECT = "/dashboard/profile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Email and verification code are required" }, { status: 400 });
    }

    const result = await userEmailVerificationService.verifyOtpAndActivateUser(email, otp);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const origin = request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
      : new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?redirect_to=${encodeURIComponent(PROFILE_REDIRECT)}`;

    const supabase = createAdminClient();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate login link after verification:", linkError);
      return NextResponse.json({
        success: true,
        message: "Email verified. Please sign in.",
      });
    }

    let loginUrl = linkData.properties.action_link;
    if (!loginUrl.startsWith("http")) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
      loginUrl = `${supabaseUrl}/${loginUrl.replace(/^\//, "")}`;
    }

    return NextResponse.json({ success: true, loginUrl });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
