/**
 * Profile Notification Preferences API Route
 *
 * PATCH /api/users/profile/notification-preferences - Update notification preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as profileService from "@/lib/services/profile/profile.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/users/profile/notification-preferences
 * Body: { email_enabled, event_approved?, event_rejected?, report_due?, reports_pending_approval? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await profileService.updateNotificationPreferences(body);
    return NextResponse.json({ success: true, data });
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
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update notification preferences",
      },
      { status: 500 }
    );
  }
}
