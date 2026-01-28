/**
 * User Hierarchy API Route
 *
 * GET /api/users/hierarchy
 * Returns the complete user hierarchy tree structure
 * Used by hierarchy visualization components
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import * as hierarchyService from "@/lib/services/users/hierarchy.service";

export async function GET() {
  try {
    // Require authentication
    await requireAuth();

    // Get hierarchy tree
    const tree = await hierarchyService.getHierarchyTree();

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
