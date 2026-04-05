/**
 * Reusable OpenAPI 3 schema objects (JSON Schema dialect).
 * Samples mirror app behaviour; refine when types evolve.
 */

export const openApiComponentSchemas: Record<string, Record<string, unknown>> = {
  ApiError: {
    type: "object",
    required: ["success", "error"],
    properties: {
      success: { const: false },
      error: { type: "string" },
      details: { description: "Present on Zod validation failures" },
    },
  },

  ApiSuccess: {
    type: "object",
    required: ["success"],
    properties: {
      success: { const: true },
      data: { description: "Payload shape depends on route" },
    },
  },

  EventsListResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { const: true },
      data: {
        type: "object",
        required: ["events", "pagination"],
        properties: {
          events: { type: "array", items: { $ref: "#/components/schemas/EventSummary" } },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
    },
  },

  Pagination: {
    type: "object",
    properties: {
      total: { type: "integer", example: 42 },
      page: { type: "integer", example: 1 },
      pageSize: { type: "integer", example: 20 },
      totalPages: { type: "integer", example: 3 },
    },
  },

  EventSummary: {
    type: "object",
    description: "Subset of event row + relations; see EventWithRelations in code",
    properties: {
      id: { type: "string", format: "uuid" },
      short_id: { type: "string", example: "evt_a1b2c3" },
      title: { type: "string" },
      status: { type: "string", example: "draft" },
      starts_at: { type: "string", format: "date-time", nullable: true },
      ends_at: { type: "string", format: "date-time", nullable: true },
    },
  },

  CreateEventRequest: {
    type: "object",
    required: [
      "title",
      "starts_at",
      "ends_at",
      "venue_id",
      "dj_id",
      "expected_attendance",
      "minimum_ticket_price",
      "minimum_table_price",
      "proposed_ticket_files",
      "proposed_table_files",
    ],
    properties: {
      title: { type: "string", maxLength: 200 },
      starts_at: { type: "string", format: "date-time" },
      ends_at: { type: "string", format: "date-time" },
      venue_id: { type: "string", format: "uuid" },
      dj_id: { type: "string", format: "uuid" },
      expected_attendance: { type: "integer", minimum: 1 },
      minimum_ticket_price: { type: "number", minimum: 0 },
      minimum_table_price: { type: "number", minimum: 0 },
      notes: { type: "string", maxLength: 5000, nullable: true },
      proposed_ticket_files: {
        type: "array",
        items: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string", format: "uri" },
            name: { type: "string" },
          },
        },
      },
      proposed_table_files: {
        type: "array",
        items: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string", format: "uri" },
            name: { type: "string" },
          },
        },
      },
      verificationToken: {
        type: "string",
        description: "Optional; Global Director OTP token when creating as pre-approved",
      },
    },
  },

  UpdateEventRequest: {
    type: "object",
    description: "Partial event fields (draft updates). Same keys as create, all optional.",
    properties: {
      title: { type: "string" },
      starts_at: { type: "string", format: "date-time", nullable: true },
      ends_at: { type: "string", format: "date-time", nullable: true },
      venue_id: { type: "string", format: "uuid", nullable: true },
      dj_id: { type: "string", format: "uuid", nullable: true },
      expected_attendance: { type: "integer", nullable: true },
      minimum_ticket_price: { type: "number", nullable: true },
      minimum_table_price: { type: "number", nullable: true },
      notes: { type: "string", nullable: true },
      proposed_ticket_files: { type: "array", items: { type: "object" } },
      proposed_table_files: { type: "array", items: { type: "object" } },
    },
  },

  EventSingleResponse: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { const: true },
      data: { $ref: "#/components/schemas/EventSummary" },
    },
  },

  ApprovalActionRequest: {
    type: "object",
    required: ["comment", "verificationToken"],
    properties: {
      comment: { type: "string", minLength: 1 },
      verificationToken: { type: "string", description: "OTP verification token from /api/otp/approval/request" },
    },
  },

  ApprovalApproveResponse: {
    type: "object",
    properties: {
      event: { $ref: "#/components/schemas/EventSummary" },
      isLast: { type: "boolean", example: false },
    },
    description: "Returned directly (not wrapped in { success, data })",
  },

  ApprovalRejectResponse: {
    type: "object",
    properties: {
      event: { $ref: "#/components/schemas/EventSummary" },
    },
    description: "Shape from rejectEvent — see approval.service",
  },

  RegisterRequest: {
    type: "object",
    required: ["token", "first_name", "email", "password"],
    properties: {
      token: { type: "string" },
      first_name: { type: "string" },
      last_name: { type: "string", nullable: true },
      email: { type: "string", format: "email" },
      phone: { type: "string", nullable: true },
      password: { type: "string", description: "Encrypted payload or __PLAIN__ prefix in development" },
      country_id: { type: "string", format: "uuid" },
    },
  },

  CreateInvitationRequest: {
    type: "object",
    required: ["email", "country_id"],
    properties: {
      email: { type: "string", format: "email" },
      country_id: { type: "string", format: "uuid" },
      expires_in_days: { type: "integer", minimum: 1, maximum: 90, default: 7 },
    },
  },

  CreateUserRequest: {
    type: "object",
    required: ["email", "first_name", "role"],
    properties: {
      email: { type: "string", format: "email" },
      first_name: { type: "string" },
      last_name: { type: "string", nullable: true },
      role: {
        type: "string",
        enum: [
          "event_planner",
          "city_curator",
          "regional_curator",
          "lead_curator",
          "global_director",
          "marketing_manager",
        ],
      },
      parent_id: { type: "string", format: "uuid", nullable: true },
      country_id: { type: "string", format: "uuid" },
      city: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
    },
  },

  CreateUserDirectRequest: {
    type: "object",
    required: ["email", "first_name", "role", "password"],
    properties: {
      email: { type: "string", format: "email" },
      first_name: { type: "string" },
      last_name: { type: "string", nullable: true },
      role: { type: "string" },
      parent_id: { type: "string", format: "uuid", nullable: true },
      country_id: { type: "string", format: "uuid" },
      city: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      password: { type: "string", minLength: 8 },
    },
  },

  UsersListResponse: {
    type: "object",
    properties: {
      success: { const: true },
      data: {
        type: "object",
        properties: {
          data: { type: "array", items: { type: "object", additionalProperties: true } },
          pagination: {
            type: "object",
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },

  RequestCancellationBody: {
    type: "object",
    required: ["reason"],
    properties: {
      reason: { type: "string", minLength: 1, maxLength: 1000 },
    },
  },

  CreateDjRequest: {
    type: "object",
    required: ["name", "email"],
    properties: {
      name: { type: "string", maxLength: 200 },
      email: { type: "string", format: "email" },
      picture_url: { type: "string", format: "uri", nullable: true },
      music_style: { type: "string", nullable: true },
      price: { type: "number", minimum: 0, nullable: true },
      technical_rider: { type: "array", items: { type: "object" } },
      hospitality_rider: { type: "array", items: { type: "object" } },
    },
  },

  UpdateDjRequest: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string", format: "email" },
      picture_url: { type: "string", nullable: true },
      music_style: { type: "string", nullable: true },
      price: { type: "number", nullable: true },
      technical_rider: { type: "array", items: { type: "object" } },
      hospitality_rider: { type: "array", items: { type: "object" } },
    },
  },

  VerifyPublicOtpBody: {
    type: "object",
    required: ["token", "code"],
    properties: {
      token: { type: "string" },
      code: { type: "string", description: "OTP from email" },
    },
  },

  VenueCreateRequest: {
    type: "object",
    description:
      "Full venue payload validated by `createVenueSchema` (lib/validation/venues.schema.ts): step1 location, step2 capacity, step3 media, etc.",
    additionalProperties: true,
  },

  MarketingReportSubmit: {
    type: "object",
    required: ["marketing_flyers", "marketing_videos", "marketing_strategy_files", "marketing_budget"],
    properties: {
      notes: { type: "string", maxLength: 5000, nullable: true },
      marketing_flyers: {
        type: "array",
        minItems: 1,
        items: { type: "object", properties: { url: { type: "string", format: "uri" }, name: { type: "string" } } },
      },
      marketing_videos: {
        type: "array",
        minItems: 1,
        items: { type: "object", properties: { url: { type: "string", format: "uri" }, name: { type: "string" } } },
      },
      marketing_strategy_files: {
        type: "array",
        minItems: 1,
        items: { type: "object", properties: { url: { type: "string", format: "uri" }, name: { type: "string" } } },
      },
      marketing_budget: { type: "number", exclusiveMinimum: 0 },
    },
  },

  UpdateProfileRequest: {
    type: "object",
    properties: {
      first_name: { type: "string" },
      last_name: { type: "string", nullable: true },
      city: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      password: { type: "string" },
      password_confirmation: { type: "string" },
      email: { type: "string", format: "email" },
      role: { type: "string" },
      status: { type: "string", enum: ["pending", "active", "inactive"] },
      password_change_verification_token: { type: "string" },
    },
  },

  NotificationPreferencesPatch: {
    type: "object",
    description: "PATCH /api/users/profile/notification-preferences",
    properties: {
      email_enabled: { type: "boolean" },
      event_approved: { type: "boolean" },
      event_rejected: { type: "boolean" },
      report_due: { type: "boolean" },
      reports_pending_approval: { type: "boolean" },
    },
    additionalProperties: true,
  },

  CheckDuplicateVenueRequest: {
    type: "object",
    required: ["name", "street", "city", "country"],
    properties: {
      name: { type: "string" },
      street: { type: "string" },
      city: { type: "string" },
      country: { type: "string" },
      excludeId: { type: "string", format: "uuid" },
    },
  },

  CheckDuplicateVenueResponse: {
    type: "object",
    properties: {
      success: { const: true },
      data: {
        type: "object",
        properties: {
          isDuplicate: { type: "boolean" },
          duplicateVenue: { type: "object", additionalProperties: true },
        },
      },
    },
  },

  OtpApprovalRequest: {
    type: "object",
    required: ["contextType", "contextId", "action"],
    properties: {
      contextType: {
        type: "string",
        enum: ["event_approval", "venue_approval", "venue_create", "event_create", "password_change"],
      },
      contextId: { type: "string" },
      action: { type: "string", enum: ["approve", "reject", "create", "change"] },
    },
  },

  OtpApprovalRequestResponse: {
    type: "object",
    properties: {
      success: { const: true },
      expiresAt: { type: "string", format: "date-time" },
      message: { type: "string" },
      otpCode: { type: "string", description: "Only in development" },
    },
  },

  GlobalDirectorPasswordRequest: {
    type: "object",
    required: ["password"],
    properties: {
      password: { type: "string" },
    },
  },

  CronTransitionResponse: {
    oneOf: [
      {
        type: "object",
        properties: {
          success: { const: true },
          transitioned: { type: "integer", example: 0 },
          message: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      {
        type: "object",
        properties: {
          success: { type: "boolean" },
          transitioned: { type: "integer" },
          errors: { type: "array", items: { type: "string" } },
          checked: { type: "integer" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    ],
  },
};
