/**
 * Upload venue file (floor plan or media: image, video, PDF)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as storageService from "@/lib/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const ALLOWED_FLOOR_PLAN_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authUser = await requireAuth();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "media";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = type === "floorplan" ? ALLOWED_FLOOR_PLAN_TYPES : ALLOWED_MEDIA_TYPES;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${type === "floorplan" ? "PDF, images" : "images, video"}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be less than 20MB" }, { status: 400 });
    }

    const url = await storageService.uploadTemporaryVenueFile(authUser.id, file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to upload file";
    if (message.includes("mime type") && message.includes("not supported")) {
      return NextResponse.json(
        {
          error:
            "This file type is not allowed by the storage bucket. For PDF floor plans, add application/pdf to the venues bucket allowed MIME types in Supabase Dashboard: Storage → venues → Configuration.",
        },
        { status: 400 }
      );
    }
    console.error("Venue file upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
