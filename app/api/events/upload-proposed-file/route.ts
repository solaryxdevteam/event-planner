/**
 * POST /api/events/upload-proposed-file
 * Upload a proposed ticket or table file for event form (before or after draft exists).
 * Body: FormData with "file" (File).
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as storageService from "@/lib/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authUser = await requireAuth();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: images, video, PDF" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be less than 20MB" }, { status: 400 });
    }

    const url = await storageService.uploadProposedEventFile(authUser.id, file);
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
            "PDF uploads are blocked by the storage bucket. Run once: npx tsx scripts/allow-reports-bucket-pdf.ts (requires SUPABASE_SERVICE_ROLE_KEY in .env.local). Or in Supabase Dashboard: Storage → reports → Configuration → add application/pdf and application/octet-stream to Allowed MIME types.",
        },
        { status: 400 }
      );
    }
    console.error("Event proposed file upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
