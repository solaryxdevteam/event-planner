import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/services/email/dev-templates.registry";

const isDev = process.env.NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW === "true";

export async function GET() {
  if (!isDev) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  return NextResponse.json({ templates: TEMPLATES });
}
