/**
 * Users API Route
 *
 * GET /api/users - Get paginated users (Global Director: all users; others: pyramid only)
 * POST /api/users - Create a new user directly (Global Director only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { createUserSchema } from "@/lib/validation/users.schema";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Get paginated users: Global Director sees all; other roles see only their pyramid.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - searchQuery: string (optional)
 * - roleFilter: string | null (optional)
 * - statusFilter: "pending" | "active" | "inactive" | null (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const searchQuery = searchParams.get("searchQuery") || undefined;
    const roleFilter = searchParams.get("roleFilter") || null;
    const statusFilter = (searchParams.get("statusFilter") as "pending" | "active" | "inactive" | null) || null;

    // Global Director: all users; others: pyramid only
    const result = await userService.getUsersPaginatedForRequester(authUser.id, {
      page,
      limit,
      searchQuery,
      roleFilter,
      statusFilter,
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
    console.error("Failed to fetch users:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user directly (Global Director only)
 *
 * Body: CreateUserInput & { password: string } (JSON)
 */
export async function POST(request: NextRequest) {
  try {
    // Require Global Director role
    let authUser;
    try {
      authUser = await requireRole([UserRole.GLOBAL_DIRECTOR]);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ success: false, error: "Only Global Directors can create users" }, { status: 403 });
      }
      throw error;
    }

    const body = await request.json();

    // Validate input (excluding password for schema validation)
    const { password, ...userData } = body;
    const validatedData = createUserSchema.parse(userData);

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password is required and must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Create user directly
    const newUser = await userService.createUserDirectly(authUser.id, validatedData, password);

    return NextResponse.json(
      {
        success: true,
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create user:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
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
        error: error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 500 }
    );
  }
}
