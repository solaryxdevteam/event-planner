/**
 * Validate Invitation API Route
 *
 * GET /api/invitations/validate - Validate an invitation token
 */

import { NextRequest, NextResponse } from "next/server";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { NotFoundError } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invitations/validate
 * Validate an invitation token
 *
 * Query params:
 * - token: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, error: "Token parameter is required" }, { status: 400 });
    }

    // Validate invitation
    const invitation = await invitationService.validateInvitation(token);

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invalid or expired invitation token" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    console.error("Failed to validate invitation:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate invitation",
      },
      { status: 500 }
    );
  }
}
