/**
 * Profile Avatar API Route
 *
 * POST   /api/users/profile/avatar - Upload avatar
 * DELETE /api/users/profile/avatar - Remove avatar
 */

import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as profileService from "@/lib/services/profile/profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/users/profile/avatar
 * Upload user avatar (multipart/form-data, field: avatar)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await profileService.uploadAvatar(formData);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Failed to upload avatar:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/profile/avatar
 * Remove user avatar
 */
export async function DELETE() {
  try {
    await profileService.removeAvatar();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    console.error("Failed to remove avatar:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
