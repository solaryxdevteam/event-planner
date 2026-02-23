/**
 * Invitation by ID API Route
 *
 * DELETE /api/invitations/[id] - Revoke an invitation (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as invitationService from "@/lib/services/invitations/invitation.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/invitations/[id]
 * Revoke an invitation (Global Director only)
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    const { id } = await context.params;
    await invitationService.revokeInvitation(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Failed to revoke invitation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
