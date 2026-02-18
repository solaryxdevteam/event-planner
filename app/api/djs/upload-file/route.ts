/**
 * Upload DJ file (picture, technical rider, hospitality rider)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as storageService from "@/lib/services/storage/storage.service";
import { isGlobalDirector } from "@/lib/permissions/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authUser = await requireAuth();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const isGD = await isGlobalDirector(authUser.id);
    if (!isGD) {
      return NextResponse.json({ error: "Only Global Directors can upload DJ files" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "picture";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = type === "picture" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${type === "picture" ? "Images only" : "PDF, images (JPEG, PNG, GIF, WebP), or Word"}`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be less than 20MB" }, { status: 400 });
    }

    const url = await storageService.uploadTemporaryDjFile(authUser.id, file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("DJ file upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
