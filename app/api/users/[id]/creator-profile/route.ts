/**
 * GET /api/users/[id]/creator-profile
 * Get creator display info (avatar, name, email, phone) for event creator card.
 * Allowed when requester can view the user (pyramid visibility).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const { id } = await params;
    const profile = await userService.getUserCreatorProfile(authUser.id, id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "User not found or access denied" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch creator profile" },
      { status: 500 }
    );
  }
}
