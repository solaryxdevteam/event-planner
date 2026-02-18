import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as venueDAL from "@/lib/data-access/venues.dal";
import * as venueContactVerificationService from "@/lib/services/venues/venue-contact-verification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id: venueId } = await context.params;
    if (!venueId) {
      return NextResponse.json({ error: "Venue ID required" }, { status: 400 });
    }

    const subordinateIds = await getSubordinateUserIds(user.id);
    const venue = await venueDAL.findById(venueId, subordinateIds, false);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    await venueContactVerificationService.sendVerificationEmail(venueId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send venue contact verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification email" },
      { status: 500 }
    );
  }
}
