/**
 * DJ by short_id API Route
 *
 * [id] is the DJ short_id (e.g. dj-ABC12xy).
 * GET /api/djs/[id] - Get one DJ
 * PUT /api/djs/[id] - Update DJ (global_director only)
 * DELETE /api/djs/[id] - Soft delete DJ (global_director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";
import * as djService from "@/lib/services/djs/dj.service";
import { updateDjSchema } from "@/lib/validation/djs.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { id: shortId } = await params;
    const dj = await djService.getDjByShortId(shortId);
    return NextResponse.json({ success: true, data: dj });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch DJ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { id: shortId } = await params;
    const body = await request.json();
    const validated = updateDjSchema.parse(body);
    const dj = await djService.updateDj(shortId, validated);
    return NextResponse.json({ success: true, data: dj });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update DJ" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { id: shortId } = await params;
    await djService.deleteDj(shortId);
    return NextResponse.json({ success: true, data: undefined });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete DJ" },
      { status: 500 }
    );
  }
}
