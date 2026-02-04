/**
 * GET /api/events/[id]/versions - Get all versions for a specific event
 */

import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as eventVersionDAL from "@/lib/data-access/event-versions.dal";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireActiveUser(); // Ensure user is authenticated
    const { id } = await params;

    const versions = await eventVersionDAL.findByEventId(id);

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Error fetching event versions:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch event versions" },
      { status: 500 }
    );
  }
}
