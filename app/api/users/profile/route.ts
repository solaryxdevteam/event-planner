/**
 * User Profile API Route
 *
 * GET /api/users/profile - Get current user's profile
 * PUT /api/users/profile - Update current user's profile
 */

import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as profileService from "@/lib/services/profile/profile.service";
import { updateProfileSchema } from "@/lib/validation/profile.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const user = await profileService.getCurrentUserProfile();
    return NextResponse.json({ success: true, data: user });
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
    const body = await request.json();
    const validatedInput = updateProfileSchema.parse(body);
    const data = await profileService.updateProfile(validatedInput);
    return NextResponse.json({ success: true, data });
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
