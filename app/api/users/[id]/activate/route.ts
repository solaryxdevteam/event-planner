/**
 * Activate User API Route
 *
 * POST /api/users/[id]/activate - Activate a pending user (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { activateUserSchema } from "@/lib/validation/users.schema";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/users/[id]/activate
 * Activate a pending user (Global Director only)
 *
 * Body: { role?: string; country_id?: string; state_id?: string | null; city?: string | null; parent_id?: string | null } (JSON)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
          { success: false, error: "Only Global Directors can activate users" },
          { status: 403 }
        );
      }
      throw error;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedInput = activateUserSchema.parse({
      userId: id,
      ...body,
    });

    // Activate user
    const activatedUser = await userService.activateUser(authUser.id, validatedInput);

    return NextResponse.json({
      success: true,
      data: activatedUser,
    });
  } catch (error) {
    console.error("Failed to activate user:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
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
        error: error instanceof Error ? error.message : "Failed to activate user",
      },
      { status: 500 }
    );
  }
}
