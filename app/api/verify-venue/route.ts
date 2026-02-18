/**
 * Public API for venue contact verification flow
 * GET ?token= - returns venue info for display
 * POST { token, code } - verifies OTP and marks venue contact as verified
 */

import { NextRequest, NextResponse } from "next/server";
import * as venueContactVerificationService from "@/lib/services/venues/venue-contact-verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const venue = await venueContactVerificationService.getVenueByToken(token);
    if (!venue) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: venue });
  } catch (error) {
    console.error("Verify venue GET error:", error);
    return NextResponse.json({ error: "Failed to load verification" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!token || !code) {
      return NextResponse.json({ success: false, error: "Token and code are required" }, { status: 400 });
    }

    const result = await venueContactVerificationService.verifyOtpAndMarkVenue(token, code);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify venue POST error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
