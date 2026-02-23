/**
 * Check Global Director Password API Route
 *
 * POST /api/users/check-global-director-password - Verify Global Director password (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { globalDirectorPasswordSchema } from "@/lib/validation/users.schema";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/users/check-global-director-password
 * Body: { password: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole([UserRole.GLOBAL_DIRECTOR]);
    const body = await request.json();
    const { password } = globalDirectorPasswordSchema.parse(body);
    const valid = await userService.checkGlobalDirectorPassword(password);
    return NextResponse.json({ success: true, data: valid });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error }, { status: 400 });
    }
    console.error("Failed to check Global Director password:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to verify password" },
      { status: 500 }
    );
  }
}
