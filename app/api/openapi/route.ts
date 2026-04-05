import { NextRequest, NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi/build-openapi-document";

/**
 * OpenAPI 3 document for Scalar and external tools.
 * GET /api/openapi
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const doc = buildOpenApiDocument(origin);

  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
