/**
 * POST /api/events/[id]/report/upload
 * Upload a single reel or photo for a post-event report (upload-on-select, like DJForm/VenueForm).
 * Body: FormData with "file" (File) and "type" ("reel" | "photo")
 */

import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as eventDAL from "@/lib/data-access/events.dal";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as storageService from "@/lib/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireActiveUser();
    const { id: eventId } = await params;
    const subordinateIds = await getSubordinateUserIds(authUser.id);
    const event = await eventDAL.findById(eventId, subordinateIds, false);

    if (!event) {
      throw new NotFoundError("Event", eventId);
    }
    if (event.creator_id !== authUser.id) {
      throw new ForbiddenError("You can only upload report media for your own events");
    }
    if (event.status !== "completed_awaiting_report") {
      throw new ForbiddenError("Reports can only be submitted for events that are awaiting report");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type") as string | null;

    const isFile = file instanceof File || (file instanceof Blob && file.size > 0);
    if (!isFile) {
      return NextResponse.json({ success: false, error: "Missing or invalid file" }, { status: 400 });
    }
    if (type !== "reel" && type !== "photo") {
      return NextResponse.json({ success: false, error: "type must be 'reel' or 'photo'" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: "File size must be 50MB or less" }, { status: 400 });
    }

    const url = await storageService.uploadReportMedia(eventId, file as File | Blob);

    return NextResponse.json(
      {
        success: true,
        url,
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
