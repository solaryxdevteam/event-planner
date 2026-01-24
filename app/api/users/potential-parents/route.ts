/**
 * Potential Parents API Route
 *
 * GET /api/users/potential-parents - Get users that can be selected as parent for a given role
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as userService from "@/lib/services/users/user.service";
import { UserRole } from "@/lib/types/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/potential-parents
 * Get users that can be selected as parent for a given role
 *
 * Query params:
 * - role: string (required) - Role of the user being created/edited
 */
export async function GET(request: NextRequest) {
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
        return NextResponse.json(
          { success: false, error: "Only Global Directors can access this resource" },
          { status: 403 }
        );
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (!role) {
      return NextResponse.json({ success: false, error: "Role parameter is required" }, { status: 400 });
    }

    // Get all users
    const allUsers = await userService.getAllUsers(authUser.id);

    // Filter potential parents based on role hierarchy
    const roleHierarchy: Record<string, string[]> = {
      [UserRole.EVENT_PLANNER]: [
        UserRole.CITY_CURATOR,
        UserRole.REGIONAL_CURATOR,
        UserRole.LEAD_CURATOR,
        UserRole.GLOBAL_DIRECTOR,
      ],
      [UserRole.CITY_CURATOR]: [UserRole.REGIONAL_CURATOR, UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
      [UserRole.REGIONAL_CURATOR]: [UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
      [UserRole.LEAD_CURATOR]: [UserRole.GLOBAL_DIRECTOR],
      [UserRole.GLOBAL_DIRECTOR]: [],
    };

    const validParentRoles = roleHierarchy[role] || [];

    const potentialParents = allUsers
      .filter((u) => validParentRoles.includes(u.role))
      .map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        role: u.role,
      }));

    return NextResponse.json({
      success: true,
      data: potentialParents,
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
