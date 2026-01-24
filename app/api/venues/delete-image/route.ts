/**
 * API Route: Delete Venue Image
 *
 * Deletes an image from Supabase Storage
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as storageService from "@/lib/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    let authUser;
    try {
      authUser = await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      throw error;
    }

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get image URL from request body
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    // Delete the image from storage
    // The storage service will extract the path from the URL
    // We use a placeholder venueId since temporary images don't have a venueId yet
    await storageService.deleteVenueImage("temp", imageUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting venue image:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete image" },
      { status: 500 }
    );
  }
}
