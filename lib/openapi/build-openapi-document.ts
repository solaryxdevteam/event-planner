import { parseRouteTable, type HttpMethod, type SecurityMode } from "./parse-routes";
import { applyOperationDetail } from "./operation-details";
import { openApiComponentSchemas } from "./schemas";

type OpenApiPathItem = Record<string, unknown>;

function operationForMode(
  summary: string,
  tags: string[],
  security: SecurityMode,
  extra?: { description?: string }
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    summary,
    tags,
    responses: {
      "200": {
        description: "OK — JSON body uses `{ success: true, data?: ... }` for success.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              description: "See Backend Guide for consistent API response shape.",
              additionalProperties: true,
            },
          },
        },
      },
      "400": {
        description: "Validation or bad request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
            examples: {
              zod: {
                value: { success: false, error: "Validation failed", details: { issues: [] } },
              },
            },
          },
        },
      },
      "401": { description: "Not authenticated (or invalid cron secret)" },
      "403": { description: "Forbidden (role or user status)" },
      "404": { description: "Not found" },
      "500": { description: "Server error" },
    },
  };

  if (extra?.description) {
    base.description = extra.description;
  }

  if (security === "public") {
    base.security = [];
  } else if (security === "cron") {
    base.security = [{ cronBearer: [] }];
  } else {
    base.security = [{ cookieSession: [] }];
  }

  return base;
}

const UPLOAD_HINT = "Request body is typically `multipart/form-data` with file field(s); see route implementation.";

const uploadPaths = new Set([
  "/api/venues/upload-image",
  "/api/venues/upload-file",
  "/api/djs/upload-file",
  "/api/events/upload-proposed-file",
  "/api/users/profile/avatar",
  "/api/events/{id}/marketing-assets/upload",
  "/api/events/{id}/report/upload",
]);

function enrichOperation(path: string, method: HttpMethod, op: Record<string, unknown>): Record<string, unknown> {
  if (method !== "post" || !uploadPaths.has(path)) return op;
  return {
    ...op,
    description: [op.description, UPLOAD_HINT].filter(Boolean).join("\n\n"),
    requestBody: {
      description: "Multipart form data (field names depend on route).",
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  };
}

/**
 * Build OpenAPI 3.0 document for Scalar / external tools.
 */
export function buildOpenApiDocument(serverUrl: string): Record<string, unknown> {
  const routes = parseRouteTable();
  const paths: Record<string, OpenApiPathItem> = {};

  for (const route of routes) {
    const baseOp = enrichOperation(
      route.path,
      route.method,
      operationForMode(route.summary, route.tags, route.security)
    );
    const op = applyOperationDetail(route.method, route.path, baseOp);
    if (!paths[route.path]) {
      paths[route.path] = {};
    }
    const key = route.method;
    if (paths[route.path][key]) {
      throw new Error(`Duplicate OpenAPI operation: ${key.toUpperCase()} ${route.path}`);
    }
    paths[route.path][key] = op;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Event Planner API",
      version: "1.0.0",
      description: [
        "HTTP API for the Shiraz House Event Planner Next.js app (`app/api`).",
        "",
        '**Authentication:** Most routes expect a logged-in user. The browser sends Supabase session cookies automatically for same-origin `fetch` (see `apiClient` + `credentials: "include"`).',
        "Cookie names are project-specific (`sb-<project-ref>-auth-token` style). Log in via `/auth/login` in the same browser before using **Try it**.",
        "",
        "**Cron:** `GET /api/cron/transition-events` requires header `Authorization: Bearer <CRON_SECRET>`.",
        "",
        "**Dev:** Routes under `/api/dev/*` match the handlers guarded by `NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW=true` (same as the email template preview UI).",
      ].join("\n"),
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Events", description: "Event lifecycle, drafts, reports, marketing" },
      { name: "Venues", description: "Venues, templates, uploads, approvals" },
      { name: "DJs", description: "DJ profiles and files" },
      { name: "Users", description: "User management and hierarchy" },
      { name: "Invitations", description: "Invitation-only registration" },
      { name: "Approvals", description: "Event approval actions" },
      { name: "VenueApprovals", description: "Venue approval actions" },
      { name: "Reports", description: "Post-event reports" },
      { name: "Calendar", description: "Calendar endpoints" },
      { name: "Locations", description: "Geographic data" },
      { name: "Audit", description: "Audit log reads" },
      { name: "Profile", description: "Current user profile" },
      { name: "OTP", description: "One-time password flows" },
      { name: "Auth", description: "Registration and Supabase callback" },
      { name: "Public", description: "Public verification links (email tokens)" },
      { name: "Cron", description: "Scheduled job endpoints" },
      { name: "Dev", description: "Development-only tools (`NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW`)" },
      { name: "Debug", description: "Diagnostics (restrict in production)" },
    ],
    paths,
    components: {
      schemas: openApiComponentSchemas,
      securitySchemes: {
        cookieSession: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description:
            "Placeholder name — Supabase SSR uses project-scoped cookie names. Session is established by signing in through the web app.",
        },
        cronBearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "CRON_SECRET",
          description: "Must equal the `CRON_SECRET` environment variable.",
        },
      },
    },
  };
}
