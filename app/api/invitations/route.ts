/**
 * Invitations API Route
 *
 * GET  /api/invitations - List invitations (Global Director only)
 * POST /api/invitations - Create an invitation (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { createInvitationSchema } from "@/lib/validation/invitations.schema";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invitations
 * List all invitations (Global Director only)
 */
export async function GET() {
  try {
    await requireRole([UserRole.GLOBAL_DIRECTOR]);
    const invitations = await invitationService.listInvitations();
    return NextResponse.json({ success: true, data: invitations });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Failed to list invitations:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to list invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * Create an invitation (Global Director only)
 *
 * Body: { email: string; country_id: string; expires_in_days?: number } (JSON)
 */
export async function POST(request: NextRequest) {
  try {
    // Require Global Director role
    let authUser;
    try {
      authUser = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          { success: false, error: "Only Global Directors can create invitations" },
          { status: 403 }
        );
      }
      throw error;
    }

    const body = await request.json();

    // Validate input
    const validatedInput = createInvitationSchema.parse(body);

    // Create invitation
    const invitation = await invitationService.createInvitation(authUser.id, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: invitation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create invitation:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    // Handle validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create invitation",
      },
      { status: 500 }
    );
  }
}
