/**
 * User by ID API Route
 *
 * GET /api/users/[id] - Get minimal user info (Global Director only, for combobox display)
 * PUT /api/users/[id] - Update a user (Global Director only)
 * DELETE /api/users/[id] - Deactivate a user (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { updateUserSchema, deactivateUserSchema } from "@/lib/validation/users.schema";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/[id]
 * Get minimal user info (for Reports To combobox display)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([UserRole.GLOBAL_DIRECTOR]);
    const { id } = await params;
    const user = await userService.getUserMinimal(id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 * Update a user (Global Director only)
 *
 * Body: UpdateUserInput (JSON)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        return NextResponse.json({ success: false, error: "Only Global Directors can update users" }, { status: 403 });
      }
      throw error;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedInput = updateUserSchema.parse(body);

    // Update user
    const updatedUser = await userService.updateUser(authUser.id, id, validatedInput);

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user:", error);

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
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Deactivate a user (Global Director only)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
          { success: false, error: "Only Global Directors can deactivate users" },
          { status: 403 }
        );
      }
      throw error;
    }

    const { id } = await params;

    // Validate input
    deactivateUserSchema.parse({ userId: id });

    // Deactivate user
    await userService.deactivateUser(authUser.id, id);

    return NextResponse.json({
      success: true,
      data: undefined,
    });
  } catch (error) {
    console.error("Failed to deactivate user:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to deactivate user",
      },
      { status: 500 }
    );
  }
}
