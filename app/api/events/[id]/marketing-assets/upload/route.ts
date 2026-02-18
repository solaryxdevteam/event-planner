/**
 * POST /api/events/[id]/marketing-assets/upload - Upload a single flyer or video file
 * Body: FormData with "file" (File) and "type" ("flyer" | "video")
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import * as storageService from "@/lib/services/storage/storage.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth();
    if (authUser.dbUser.role !== UserRole.MARKETING_MANAGER) {
      return NextResponse.json(
        { success: false, error: "Only Marketing Managers can upload marketing assets" },
        { status: 403 }
      );
    }
    const { id: eventId } = await params;

    await eventService.getEventById(authUser.id, eventId);

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing or invalid file" }, { status: 400 });
    }

    if (type !== "flyer" && type !== "video") {
      return NextResponse.json({ success: false, error: "type must be 'flyer' or 'video'" }, { status: 400 });
    }

    const result = await storageService.uploadEventMarketingFile(eventId, file, type);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
