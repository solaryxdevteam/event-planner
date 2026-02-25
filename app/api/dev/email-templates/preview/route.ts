import { NextRequest, NextResponse } from "next/server";
import { getRenderedHtml, isValidTemplateId } from "@/lib/services/email/dev-templates.registry";

const isDev = process.env.NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW === "true";

export async function GET(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const template = request.nextUrl.searchParams.get("template");
  if (!template || !isValidTemplateId(template)) {
    return NextResponse.json({ error: "Missing or invalid template query parameter" }, { status: 400 });
  }

  const html = getRenderedHtml(template);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
