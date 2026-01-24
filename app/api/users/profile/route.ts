/**
 * User Profile API Route
 *
 * GET /api/users/profile - Get current user's profile
 * PUT /api/users/profile - Update current user's profile
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as profileService from "@/lib/actions/profile";
import { updateProfileSchema } from "@/lib/validation/profile.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication (allows pending users)
    let authUser;
    try {
      authUser = await requireAuth(true); // Allow pending users
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const result = await profileService.getCurrentUserProfile();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Failed to fetch user profile:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user profile",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/profile
 * Update current user's profile
 *
 * Body: UpdateProfileInput (JSON)
 */
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const body = await request.json();

    // Validate input
    const validatedInput = updateProfileSchema.parse(body);

    // Update profile
    const result = await profileService.updateProfile(validatedInput);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);

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
        error: error instanceof Error ? error.message : "Failed to update user profile",
      },
      { status: 500 }
    );
  }
}
