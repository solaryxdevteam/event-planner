/**
 * API Route: Upload Venue Image (Temporary)
 *
 * Uploads images before venue creation. Images are stored in a temporary location
 * and can be moved to the venue folder after venue creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as storageService from "@/lib/services/storage/storage.service";

// Ensure this route is handled as an API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Export config to ensure proper handling
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      // Handle authentication errors
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      // Re-throw other errors
      throw error;
    }

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const userId = authUser.id; // Use user ID for temporary storage

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Upload to temporary location (using user ID)
    const imageUrl = await storageService.uploadTemporaryVenueImage(userId, file);

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Error uploading venue image:", error);

    // Handle specific error types
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Handle storage errors
    if (error instanceof Error) {
      // Check if it's a bucket error
      if (error.message.includes("Bucket not found")) {
        return NextResponse.json(
          { error: "Storage bucket not configured. Please contact administrator." },
          { status: 500 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
