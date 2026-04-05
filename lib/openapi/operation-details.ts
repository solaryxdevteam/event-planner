/**
 * Per-operation OpenAPI overrides: query/path parameters, JSON bodies, response schemas & examples.
 * Key format: `${method}|${path}` (method lowercase, path matches parse-routes.ts).
 */

import type { HttpMethod } from "./parse-routes";

export type OperationDetail = {
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses?: Record<string, Record<string, unknown>>;
  /** Appended to operation summary/description */
  docNote?: string;
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

function bodyJson(schemaName: string, example: unknown) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: ref(schemaName),
        examples: {
          sample: {
            summary: "Example payload",
            value: example,
          },
        },
      },
    },
  };
}

function res(schemaName: string, example: unknown, description = "Success") {
  return {
    description,
    content: {
      "application/json": {
        schema: ref(schemaName),
        examples: { sample: { value: example } },
      },
    },
  };
}

function resFree(example: unknown, description = "Success") {
  return {
    description,
    content: {
      "application/json": {
        schema: { type: "object", additionalProperties: true },
        examples: { sample: { value: example } },
      },
    },
  };
}

const param = (
  name: string,
  loc: "query" | "path",
  schema: Record<string, unknown>,
  description: string,
  required = true
) => ({
  name,
  in: loc,
  required,
  description,
  schema,
});

/** Query params for GET /api/events (see app/api/events/route.ts) */
const EVENT_LIST_PARAMS = [
  param("status", "query", { type: "string" }, "Single status or comma-separated list", false),
  param("creatorId", "query", { type: "string", format: "uuid" }, "Filter by creator", false),
  param("venueId", "query", { type: "string", format: "uuid" }, "Filter by venue", false),
  param("dateFrom", "query", { type: "string", format: "date" }, "ISO date", false),
  param("dateTo", "query", { type: "string", format: "date" }, "ISO date", false),
  param("startsAtFrom", "query", { type: "string", format: "date-time" }, "", false),
  param("startsAtTo", "query", { type: "string", format: "date-time" }, "", false),
  param("search", "query", { type: "string" }, "Free-text search", false),
  param("state", "query", { type: "string" }, "Venue state filter", false),
  param("page", "query", { type: "integer", default: 1 }, "Page number", false),
  param("pageSize", "query", { type: "integer", default: 20 }, "Page size", false),
  param("needsMarketingReport", "query", { type: "boolean" }, "Marketing manager filter", false),
];

const USERS_LIST_PARAMS = [
  param("page", "query", { type: "integer", default: 1 }, "", false),
  param("limit", "query", { type: "integer", default: 10 }, "", false),
  param("searchQuery", "query", { type: "string" }, "", false),
  param("roleFilter", "query", { type: "string" }, "", false),
  param("statusFilter", "query", { type: "string", enum: ["pending", "active", "inactive"] }, "", false),
];

const LOCATIONS_PARAMS = [
  param(
    "type",
    "query",
    { type: "string", enum: ["countries", "states", "cities", "default-country"] },
    "Hierarchy level",
    false
  ),
  param("countryId", "query", { type: "string", format: "uuid" }, "Required for states", false),
  param("stateId", "query", { type: "string", format: "uuid" }, "Required for cities", false),
  param("id", "query", { type: "string", format: "uuid" }, "Load single location by id", false),
];

const INVITE_VALIDATE_PARAMS = [param("token", "query", { type: "string" }, "Invitation token", true)];

const VERIFY_TOKEN_PARAMS = [param("token", "query", { type: "string" }, "Signed token from email link", true)];

const VENUES_LIST_PARAMS = [
  param("search", "query", { type: "string" }, "Search name/address", false),
  param("state", "query", { type: "string" }, "Filter by state or `all`", false),
  param("status", "query", { type: "string", enum: ["all", "active", "banned"] }, "Venue status filter", false),
  param("specs", "query", { type: "string" }, "Comma-separated spec filters", false),
  param("dateFrom", "query", { type: "string", format: "date" }, "", false),
  param("dateTo", "query", { type: "string", format: "date" }, "", false),
  param("standingMin", "query", { type: "number" }, "", false),
  param("standingMax", "query", { type: "number" }, "", false),
  param("seatedMin", "query", { type: "number" }, "", false),
  param("seatedMax", "query", { type: "number" }, "", false),
  param("page", "query", { type: "integer", default: 1 }, "", false),
  param("pageSize", "query", { type: "integer", default: 9 }, "", false),
];

const pathId = (name: string) =>
  param(name, "path", { type: "string", format: "uuid" }, `Path parameter ${name}`, true);
const pathShort = (name: string) => param(name, "path", { type: "string" }, `Path parameter ${name}`, true);

const CREATE_EVENT_EXAMPLE = {
  title: "Summer Gala",
  starts_at: "2026-07-15T20:00:00.000Z",
  ends_at: "2026-07-16T02:00:00.000Z",
  venue_id: "00000000-0000-4000-8000-000000000001",
  dj_id: "00000000-0000-4000-8000-000000000002",
  expected_attendance: 500,
  minimum_ticket_price: 25,
  minimum_table_price: 500,
  notes: "Optional notes",
  proposed_ticket_files: [{ url: "https://cdn.example.com/ticket.pdf", name: "pricing.pdf" }],
  proposed_table_files: [{ url: "https://cdn.example.com/table.pdf", name: "layout.pdf" }],
};

export const OPERATION_DETAILS: Record<string, OperationDetail> = {
  "get|/api/events": {
    parameters: EVENT_LIST_PARAMS,
    responses: {
      "200": res(
        "EventsListResponse",
        {
          success: true,
          data: {
            events: [
              {
                id: "00000000-0000-4000-8000-000000000010",
                short_id: "evt_abc123",
                title: "Summer Gala",
                status: "draft",
                starts_at: "2026-07-15T20:00:00.000Z",
                ends_at: "2026-07-16T02:00:00.000Z",
              },
            ],
            pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
          },
        },
        "Paginated events for the current user (visibility rules apply)"
      ),
    },
  },

  "post|/api/events": {
    requestBody: bodyJson("CreateEventRequest", CREATE_EVENT_EXAMPLE),
    responses: {
      "201": res(
        "EventSingleResponse",
        {
          success: true,
          data: {
            id: "00000000-0000-4000-8000-000000000010",
            short_id: "evt_abc123",
            title: "Summer Gala",
            status: "draft",
          },
        },
        "Created draft (or approved for Global Director + verification token flow)"
      ),
    },
  },

  "get|/api/events/{id}": {
    parameters: [pathId("id")],
    responses: {
      "200": res(
        "EventSingleResponse",
        {
          success: true,
          data: {
            id: "00000000-0000-4000-8000-000000000010",
            short_id: "evt_abc123",
            title: "Summer Gala",
            status: "draft",
          },
        },
        "Single event with relations"
      ),
    },
  },

  "put|/api/events/{id}": {
    parameters: [pathId("id")],
    requestBody: bodyJson("UpdateEventRequest", {
      title: "Updated title",
      notes: "Draft notes",
    }),
    responses: {
      "200": res(
        "EventSingleResponse",
        {
          success: true,
          data: { id: "00000000-0000-4000-8000-000000000010", title: "Updated title", status: "draft" },
        },
        "Updated draft"
      ),
    },
  },

  "post|/api/events/{id}/submit": {
    parameters: [pathId("id")],
    responses: {
      "200": res(
        "EventSingleResponse",
        { success: true, data: { id: "00000000-0000-4000-8000-000000000010", status: "in_review" } },
        "Submitted for approval"
      ),
    },
  },

  "post|/api/events/{id}/cancel": {
    parameters: [pathId("id")],
    requestBody: bodyJson("RequestCancellationBody", { reason: "Venue unavailable" }),
    responses: {
      "200": resFree({ success: true, data: { status: "cancelled" } }, "Cancellation requested or event updated"),
    },
  },

  "post|/api/events/{id}/marketing-reports": {
    parameters: [pathId("id")],
    requestBody: bodyJson("MarketingReportSubmit", {
      notes: "Campaign summary",
      marketing_flyers: [{ url: "https://cdn.example.com/flyer.pdf" }],
      marketing_videos: [{ url: "https://cdn.example.com/promo.mp4" }],
      marketing_strategy_files: [{ url: "https://cdn.example.com/strategy.pdf" }],
      marketing_budget: 15000,
    }),
    responses: {
      "200": resFree({ success: true, data: { id: "00000000-0000-4000-8000-000000000099" } }, "Marketing report saved"),
    },
  },

  "get|/api/users": {
    parameters: USERS_LIST_PARAMS,
    responses: {
      "200": res(
        "UsersListResponse",
        {
          success: true,
          data: {
            data: [{ id: "00000000-0000-4000-8000-000000000001", email: "user@example.com", role: "event_planner" }],
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
          },
        },
        "Paginated users (pyramid / GD rules)"
      ),
    },
  },

  "post|/api/users": {
    requestBody: bodyJson("CreateUserDirectRequest", {
      email: "new@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      role: "event_planner",
      password: "SecurePass123",
      country_id: "00000000-0000-4000-8000-0000000000aa",
    }),
    responses: {
      "201": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000001", email: "new@example.com" } },
        "User created"
      ),
    },
  },

  "post|/api/invitations": {
    requestBody: bodyJson("CreateInvitationRequest", {
      email: "invite@example.com",
      country_id: "00000000-0000-4000-8000-0000000000aa",
      expires_in_days: 7,
    }),
    responses: {
      "201": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-0000000000bb", token: "secure-token" } },
        "Invitation created"
      ),
    },
  },

  "get|/api/invitations/validate": {
    parameters: INVITE_VALIDATE_PARAMS,
    responses: {
      "200": resFree(
        { success: true, data: { email: "invite@example.com", country_id: "00000000-0000-4000-8000-0000000000aa" } },
        "Valid token"
      ),
    },
  },

  "post|/api/auth/register": {
    requestBody: bodyJson("RegisterRequest", {
      token: "invitation-token",
      first_name: "Ada",
      email: "user@example.com",
      password: "<encrypted-or-__PLAIN__dev>",
    }),
    responses: {
      "200": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000001" } },
        "User registered (pending activation)"
      ),
    },
  },

  "post|/api/approvals/{eventId}/approve": {
    parameters: [pathId("eventId")],
    requestBody: bodyJson("ApprovalActionRequest", {
      comment: "Approved — budget looks good.",
      verificationToken: "otp-verification-token",
    }),
    responses: {
      "200": resFree(
        {
          event: { id: "00000000-0000-4000-8000-000000000010", status: "approved_scheduled" },
          isLast: false,
        },
        "Returns `{ event, isLast }` directly (not wrapped in success/data)"
      ),
    },
  },

  "post|/api/approvals/{eventId}/reject": {
    parameters: [pathId("eventId")],
    requestBody: bodyJson("ApprovalActionRequest", {
      comment: "Please adjust ticket pricing.",
      verificationToken: "otp-verification-token",
    }),
    responses: {
      "200": resFree({ event: { id: "00000000-0000-4000-8000-000000000010" } }, "Reject result from service"),
    },
  },

  "post|/api/venue-approvals/{venueId}/approve": {
    parameters: [pathId("venueId")],
    requestBody: bodyJson("ApprovalActionRequest", {
      comment: "Venue meets requirements.",
      verificationToken: "otp-verification-token",
    }),
    responses: {
      "200": resFree(
        { id: "00000000-0000-4000-8000-000000000020", approval_status: "approved" },
        "Venue approval payload"
      ),
    },
  },

  "post|/api/venue-approvals/{venueId}/reject": {
    parameters: [pathId("venueId")],
    requestBody: bodyJson("ApprovalActionRequest", {
      comment: "Missing fire certificate.",
      verificationToken: "otp-verification-token",
    }),
    responses: {
      "200": resFree({ message: "rejected" }, "Service-dependent shape"),
    },
  },

  "post|/api/venues/check-duplicate": {
    requestBody: bodyJson("CheckDuplicateVenueRequest", {
      name: "Club Nova",
      street: "123 Main St",
      city: "Los Angeles",
      country: "United States",
    }),
    responses: {
      "200": res("CheckDuplicateVenueResponse", { success: true, data: { isDuplicate: false } }, "Duplicate check"),
    },
  },

  "patch|/api/users/profile/notification-preferences": {
    requestBody: bodyJson("NotificationPreferencesPatch", {
      email_enabled: true,
      event_approved: true,
      event_rejected: true,
    }),
    responses: {
      "200": resFree({ success: true, data: { email_enabled: true } }, "Updated preferences"),
    },
  },

  "post|/api/users/check-global-director-password": {
    requestBody: bodyJson("GlobalDirectorPasswordRequest", { password: "••••••••" }),
    responses: {
      "200": resFree({ success: true, valid: true }, "Password check result"),
    },
  },

  "post|/api/otp/approval/request": {
    requestBody: bodyJson("OtpApprovalRequest", {
      contextType: "event_approval",
      contextId: "00000000-0000-4000-8000-000000000010",
      action: "approve",
    }),
    responses: {
      "200": res(
        "OtpApprovalRequestResponse",
        {
          success: true,
          expiresAt: "2026-04-04T12:30:00.000Z",
          message: "Verification code sent to your email.",
        },
        "OTP sent (otpCode only in development)"
      ),
    },
  },

  "get|/api/cron/transition-events": {
    responses: {
      "200": res(
        "CronTransitionResponse",
        {
          success: true,
          transitioned: 2,
          errors: [],
          checked: 5,
          timestamp: "2026-04-04T12:00:00.000Z",
        },
        "Bearer CRON_SECRET required"
      ),
    },
  },

  "get|/api/locations": {
    parameters: LOCATIONS_PARAMS,
    responses: {
      "200": resFree(
        {
          success: true,
          data: [{ id: "00000000-0000-4000-8000-0000000000c1", name: "United States", type: "country" }],
        },
        "Countries, states, cities, or single row"
      ),
    },
  },

  "get|/api/events/short-id/{shortId}": {
    parameters: [pathShort("shortId")],
    responses: {
      "200": res(
        "EventSingleResponse",
        { success: true, data: { short_id: "evt_abc123", title: "Gala" } },
        "Event by short id"
      ),
    },
  },

  "get|/api/venues/short-id/{shortId}": {
    parameters: [pathShort("shortId")],
    responses: {
      "200": resFree({ success: true, data: { short_id: "ven_xyz", name: "Club Nova" } }, "Venue"),
    },
  },

  "get|/api/venues": {
    parameters: VENUES_LIST_PARAMS,
    responses: {
      "200": resFree(
        {
          success: true,
          data: {
            venues: [{ id: "00000000-0000-4000-8000-000000000020", name: "Club Nova", short_id: "ven_xyz" }],
            pagination: { total: 1, page: 1, pageSize: 9, totalPages: 1 },
          },
        },
        "Filtered venue list"
      ),
    },
  },

  "post|/api/venues": {
    requestBody: bodyJson("VenueCreateRequest", {
      name: "Club Nova",
      street: "123 Main St",
      city: "Los Angeles",
      country: "United States",
      country_id: "00000000-0000-4000-8000-0000000000aa",
      location_lat: 34.05,
      location_lng: -118.25,
      total_capacity: 500,
      verificationToken: "optional-gd-otp-token",
    }),
    responses: {
      "201": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000020", short_id: "ven_xyz", name: "Club Nova" } },
        "Created venue"
      ),
    },
  },

  "post|/api/djs": {
    requestBody: bodyJson("CreateDjRequest", {
      name: "DJ Alex",
      email: "dj@example.com",
      music_style: "House",
      price: 5000,
      technical_rider: [],
      hospitality_rider: [],
    }),
    responses: {
      "201": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000030", name: "DJ Alex" } },
        "Created DJ"
      ),
    },
  },

  "put|/api/djs/{id}": {
    parameters: [pathId("id")],
    requestBody: bodyJson("UpdateDjRequest", { name: "DJ Alex (updated)", music_style: "Techno" }),
    responses: {
      "200": resFree({ success: true, data: { id: "00000000-0000-4000-8000-000000000030" } }, "Updated DJ"),
    },
  },

  "put|/api/users/profile": {
    requestBody: bodyJson("UpdateProfileRequest", {
      first_name: "Ada",
      city: "San Francisco",
      phone: "+14155550100",
    }),
    responses: {
      "200": resFree({ success: true, data: { first_name: "Ada" } }, "Profile updated"),
    },
  },

  "put|/api/reports/{id}": {
    parameters: [pathId("id")],
    requestBody: {
      required: true,
      description:
        "Resubmit rejected report via `multipart/form-data` (see route): attendance_count, detailed_report, feedback, external_links (JSON string), file fields.",
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              attendance_count: { type: "string", example: "450" },
              detailed_report: { type: "string" },
              feedback: { type: "string" },
              external_links: { type: "string", description: "JSON array of {url,title}" },
            },
            additionalProperties: true,
          },
        },
      },
    },
    responses: {
      "200": resFree({ success: true, data: { id: "00000000-0000-4000-8000-000000000040" } }, "Report updated"),
    },
  },

  "post|/api/events/{id}/transition": {
    parameters: [pathId("id")],
    docNote: "No JSON body. Global Director only.",
    responses: {
      "200": resFree({ success: true, message: "Event transitioned successfully" }, "Manual status transition"),
    },
  },

  "get|/api/verify-venue": {
    parameters: VERIFY_TOKEN_PARAMS,
    responses: {
      "200": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000020", name: "Club Nova" } },
        "Venue preview for OTP form"
      ),
      "400": { description: "Missing token" },
    },
  },

  "post|/api/verify-venue": {
    requestBody: bodyJson("VerifyPublicOtpBody", { token: "signed-token-from-email", code: "123456" }),
    responses: {
      "200": resFree({ success: true }, "Contact verified"),
    },
  },

  "get|/api/verify-dj": {
    parameters: VERIFY_TOKEN_PARAMS,
    responses: {
      "200": resFree(
        { success: true, data: { id: "00000000-0000-4000-8000-000000000030", name: "DJ Alex" } },
        "DJ preview"
      ),
    },
  },

  "post|/api/verify-dj": {
    requestBody: bodyJson("VerifyPublicOtpBody", { token: "signed-token-from-email", code: "123456" }),
    responses: {
      "200": resFree({ success: true }, "DJ contact verified"),
    },
  },
};

export function getOperationDetail(method: HttpMethod, path: string): OperationDetail | undefined {
  return OPERATION_DETAILS[`${method}|${path}`];
}

export function applyOperationDetail(
  method: HttpMethod,
  path: string,
  baseOp: Record<string, unknown>
): Record<string, unknown> {
  const detail = getOperationDetail(method, path);
  if (!detail) return baseOp;

  const merged: Record<string, unknown> = { ...baseOp };

  if (detail.parameters) {
    merged.parameters = detail.parameters;
  }
  if (detail.requestBody) {
    merged.requestBody = detail.requestBody;
  }
  if (detail.responses) {
    const baseResponses = { ...(baseOp.responses as Record<string, unknown>) };
    // Avoid implying POST creates return 200 when the route returns 201
    if (detail.responses["201"] && detail.responses["200"] === undefined) {
      delete baseResponses["200"];
    }
    merged.responses = {
      ...baseResponses,
      ...detail.responses,
    };
  }
  if (detail.docNote) {
    merged.description = [baseOp.description, detail.docNote].filter(Boolean).join("\n\n");
  }

  return merged;
}
