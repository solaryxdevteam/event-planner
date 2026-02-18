/**
 * GET /api/venues/[id]/approvals - Get approval chain for a venue
 *
 * Returns approval records for the venue (for display in approval timeline).
 * User must be authenticated.
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as venueApprovalDAL from "@/lib/data-access/venue-approvals.dal";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser();
    const { id: venueId } = await params;

    const approvals = await venueApprovalDAL.findByVenueId(venueId, true);

    return NextResponse.json(approvals);
  } catch (error) {
    console.error("Error fetching venue approvals:", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to fetch venue approvals",
      },
      { status: 500 }
    );
  }
}
