/**
 * GET /api/events/[id]/approvals - Get approval chain for a specific event
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as approvalDAL from "@/lib/data-access/event-approvals.dal";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser(); // Ensure user is authenticated
    const { id } = await params;

    const approvals = await approvalDAL.findByEventId(id, true);

    return NextResponse.json(approvals);
  } catch (error) {
    console.error("Error fetching event approvals:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch event approvals" },
      { status: 500 }
    );
  }
}
