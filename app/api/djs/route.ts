/**
 * DJs API Route
 *
 * GET /api/djs - List DJs with filters (everyone)
 * POST /api/djs - Create DJ (global_director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireActiveUser } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as djService from "@/lib/services/djs/dj.service";
import { createDjSchema } from "@/lib/validation/djs.schema";
import type { DJFilterOptions } from "@/lib/data-access/djs.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/djs
 * Query: search, activeOnly, includeDeleted, page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters: DJFilterOptions = {
      search: searchParams.get("search") || undefined,
      activeOnly: searchParams.get("activeOnly") !== "false",
      includeDeleted: searchParams.get("includeDeleted") === "true",
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "12", 10),
    };

    const result = await djService.getDjsWithFilters(filters);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to fetch DJs:", error);
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch DJs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/djs - Create DJ (global_director only; active users only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireActiveUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: "Your account must be active to perform this action." },
        { status: 403 }
      );
    }
    throw error;
  }

  try {
    const body = await request.json();
    const validated = createDjSchema.parse(body);
    const dj = await djService.createDj(validated);
    return NextResponse.json({ success: true, data: dj }, { status: 201 });
  } catch (error) {
    console.error("Failed to create DJ:", error);
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create DJ" },
      { status: 500 }
    );
  }
}
