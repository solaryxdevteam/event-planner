/**
 * User Hierarchy API Route
 *
 * GET /api/users/hierarchy
 * Returns hierarchy tree: full tree for Global Director, pyramid only for others
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import * as hierarchyService from "@/lib/services/users/hierarchy.service";
import { UserRole } from "@/lib/types/roles";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const tree =
      user.dbUser.role === UserRole.GLOBAL_DIRECTOR
        ? await hierarchyService.getHierarchyTree()
        : await hierarchyService.getHierarchyTreeForUser(user.id);

    return NextResponse.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error("Failed to fetch user hierarchy:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user hierarchy",
      },
      { status: 500 }
    );
  }
}
