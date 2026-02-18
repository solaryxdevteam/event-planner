/**
 * POST /api/djs/[id]/deactivate - Deactivate DJ (global_director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as djService from "@/lib/services/djs/dj.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { id } = await params;
    await djService.deactivateDj(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to deactivate DJ" },
      { status: 500 }
    );
  }
}
