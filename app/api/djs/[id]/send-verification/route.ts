import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import * as djDAL from "@/lib/data-access/djs.dal";
import * as djContactVerificationService from "@/lib/services/djs/dj-contact-verification.service";
import { isGlobalDirector } from "@/lib/permissions/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/djs/[id]/send-verification
 * [id] = DJ short_id. Resend verification email to the DJ.
 * Only global_director.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!(await isGlobalDirector(user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: shortId } = await context.params;
    if (!shortId) {
      return NextResponse.json({ error: "DJ ID required" }, { status: 400 });
    }

    const dj = await djDAL.findByShortId(shortId);
    if (!dj || dj.deleted_at) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 });
    }

    await djContactVerificationService.sendVerificationEmail(dj.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send DJ verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification email" },
      { status: 500 }
    );
  }
}
