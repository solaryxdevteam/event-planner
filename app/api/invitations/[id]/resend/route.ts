/**
 * Resend Invitation API Route
 *
 * POST /api/invitations/[id]/resend - Resend an invitation (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invitations/[id]/resend
 * Resend an invitation (invalidates old link, creates and sends new one)
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    const { id } = await context.params;
    const invitation = await invitationService.resendInvitation(user.id, id);
    return NextResponse.json({ success: true, data: invitation }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Failed to resend invitation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
