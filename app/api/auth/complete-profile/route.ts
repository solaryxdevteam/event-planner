/**
 * Complete Profile API Route
 * Handles user profile creation after magic link authentication
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { completeUserProfile } from "@/lib/actions/auth.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, region } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const result = await completeUserProfile({
      name,
      city,
      region,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Error completing profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
