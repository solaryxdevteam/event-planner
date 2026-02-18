/**
 * Potential Parents API Route
 *
 * GET /api/users/potential-parents - Get users that can be selected as parent for a given role
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/potential-parents
 * Get users that can be selected as parent for a given role (paginated, searchable)
 *
 * Query params:
 * - role: string (required) - Role of the user being created/edited
 * - query: string (optional) - Search by name or email
 * - page: number (default 1)
 * - limit: number (default 20, max 50)
 * - excludeUserId: string (optional) - Exclude this user ID (e.g. when editing)
 */
export async function GET(request: NextRequest) {
  try {
    let authUser;
    try {
      authUser = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          { success: false, error: "Only Global Directors can access this resource" },
          { status: 403 }
        );
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const query = searchParams.get("query") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const excludeUserId = searchParams.get("excludeUserId") || undefined;

    if (!role) {
      return NextResponse.json({ success: false, error: "Role parameter is required" }, { status: 400 });
    }

    const result = await userService.getPotentialParentsPaginated(authUser.id, role, {
      searchQuery: query,
      page,
      limit,
      excludeUserId,
    });

    return NextResponse.json({
      success: true,
      data: {
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch potential parents:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch potential parents",
      },
      { status: 500 }
    );
  }
}
