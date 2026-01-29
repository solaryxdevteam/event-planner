/**
 * Venue Duplicate Check API Route
 *
 * POST /api/venues/check-duplicate - Check if a venue with same name, street, city, country exists
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError } from "@/lib/utils/errors";
import * as venueDAL from "@/lib/data-access/venues.dal";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkDuplicateSchema = z.object({
  name: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  excludeId: z.string().optional(),
});

/**
 * POST /api/venues/check-duplicate
 * Check if a duplicate venue exists
 *
 * Body: { name, street, city, country, excludeId? }
 * Returns: { isDuplicate: boolean, duplicateVenue?: Venue }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    try {
      await requireAuth();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      throw error;
    }

    const body = await request.json();

    // Validate input
    const validatedInput = checkDuplicateSchema.parse(body);

    // Check for duplicates
    const duplicate = await venueDAL.findDuplicate(
      validatedInput.name,
      validatedInput.street,
      validatedInput.city,
      validatedInput.country,
      validatedInput.excludeId
    );

    return NextResponse.json({
      success: true,
      data: {
        isDuplicate: !!duplicate,
        duplicateVenue: duplicate
          ? {
              id: duplicate.id,
              short_id: duplicate.short_id,
              name: duplicate.name,
              street: duplicate.street,
              city: duplicate.city,
              country: duplicate.country,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to check venue duplicate:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
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
        error: error instanceof Error ? error.message : "Failed to check duplicate",
      },
      { status: 500 }
    );
  }
}
