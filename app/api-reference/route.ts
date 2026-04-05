import { ApiReference } from "@scalar/nextjs-api-reference";

const renderReference = ApiReference({
  pageTitle: "Event Planner API",
  url: "/api/openapi",
});

/**
 * Scalar API Reference UI (loads spec from /api/openapi).
 * GET /api-reference
 */
export async function GET() {
  return renderReference();
}
