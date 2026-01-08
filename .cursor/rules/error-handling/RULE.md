---
description: Error handling patterns, custom error classes, and debugging utilities for consistent error management across the application
alwaysApply: true
---

# Error Handling & Utilities

## Error Classes

### Base Error Class

```typescript
// lib/utils/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Specific Error Types

```typescript
// lib/utils/errors.ts

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", metadata);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class PermissionError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, 403, "PERMISSION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}
```

## Error Handling in Server Actions

### Pattern: Try-Catch with Specific Error Types

```typescript
"use server";

import { z } from "zod";
import { createEventSchema } from "@/lib/validation/events.schema";
import { draftService } from "@/lib/services/events/draft.service";
import { getServerUser } from "@/lib/auth/server";
import {
  AppError,
  AuthenticationError,
  ValidationError,
} from "@/lib/utils/errors";
import type { ActionResponse } from "@/lib/types/api.types";

export async function createEventDraft(
  data: unknown
): Promise<ActionResponse<Event>> {
  try {
    // 1. Authenticate
    const user = await getServerUser();
    if (!user) {
      throw new AuthenticationError();
    }

    // 2. Validate input
    const validatedData = createEventSchema.parse(data);

    // 3. Call service layer
    const event = await draftService.createDraft(user.id, validatedData);

    // 4. Return success
    return { success: true, data: event };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return {
        success: false,
        error: error.errors[0]?.message || "Invalid input",
      };
    }

    // Handle app-specific errors
    if (error instanceof AppError) {
      console.error(`${error.name}:`, error.message, error.metadata);
      return {
        success: false,
        error: error.message,
      };
    }

    // Handle unexpected errors
    console.error("Unexpected error in createEventDraft:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
```

## Error Handling in Service Layer

### Pattern: Throw Custom Errors

```typescript
// lib/services/events/event.service.ts

import {
  NotFoundError,
  PermissionError,
  ConflictError,
} from "@/lib/utils/errors";

export async function submitForApproval(
  userId: string,
  eventId: string
): Promise<Event> {
  // 1. Fetch event
  const event = await eventsDAL.findById(eventId);
  if (!event) {
    throw new NotFoundError("Event");
  }

  // 2. Check ownership
  if (event.creator_id !== userId) {
    throw new PermissionError("Only the event creator can submit for approval");
  }

  // 3. Check status
  if (event.status !== "draft") {
    throw new ConflictError(`Event cannot be submitted in ${event.status} status`);
  }

  // 4. Validate event completeness
  if (!event.venue_id || !event.event_date) {
    throw new ValidationError("Event must have a venue and date before submission", {
      missingFields: ["venue_id", "event_date"].filter((field) => !event[field]),
    });
  }

  // 5. Build approval chain
  const approvers = await chainBuilder.buildChain(userId);
  if (approvers.length === 0) {
    throw new ConflictError("No approvers found in hierarchy");
  }

  // 6. Update event status
  const updated = await eventsDAL.update(eventId, {
    status: "in_review",
  });

  // 7. Create approval records
  await approvalsDAL.createChain(eventId, approvers, "event");

  // 8. Notify first approver
  await emailService.sendApprovalNotification(approvers[0], eventId, "event");

  // 9. Log audit
  await auditService.log({
    event_id: eventId,
    user_id: userId,
    action_type: "submit_for_approval",
  });

  return updated;
}
```

## Error Handling in Route Handlers

### Pattern: Return NextResponse with Status Codes

```typescript
// app/api/export/events/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import { eventService } from "@/lib/services/events/event.service";
import { AppError, AuthenticationError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Get query params
    const { searchParams } = request.nextUrl;
    const filters = {
      status: searchParams.get("status"),
      dateRange: searchParams.get("dateRange"),
    };

    // 3. Fetch events
    const events = await eventService.getEventsForUser(user.id, filters);

    // 4. Convert to CSV
    const csv = convertToCSV(events);

    // 5. Return response
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=events.csv",
      },
    });
  } catch (error) {
    // Handle app-specific errors
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    // Handle unexpected errors
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
```

## Response Utilities

### ActionResponse Type

```typescript
// lib/types/api.types.ts

export type ActionResponse<T = void> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };
```

### Response Helpers

```typescript
// lib/utils/response.ts

import type { ActionResponse } from "@/lib/types/api.types";

export function success<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function failure(error: string): ActionResponse<never> {
  return { success: false, error };
}

export function handleError(error: unknown): ActionResponse<never> {
  if (error instanceof z.ZodError) {
    return failure(error.errors[0]?.message || "Invalid input");
  }

  if (error instanceof AppError) {
    return failure(error.message);
  }

  console.error("Unexpected error:", error);
  return failure("An unexpected error occurred");
}
```

### Usage Example

```typescript
"use server";

import { success, failure, handleError } from "@/lib/utils/response";

export async function createUser(data: unknown): Promise<ActionResponse<User>> {
  try {
    const validated = createUserSchema.parse(data);
    const user = await userService.createUser(validated);
    return success(user);
  } catch (error) {
    return handleError(error);
  }
}
```

## Frontend Error Handling

### Error Boundary

```typescript
// components/shared/ErrorBoundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage in Layout

```typescript
// app/layout.tsx
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Handling Server Action Errors

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createEventDraft } from "@/lib/actions/events";

export function EventForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateEventInput) {
    setError(null);
    
    const result = await createEventDraft(data);

    if (result.success) {
      toast.success("Draft created successfully");
      // Navigate or reset form
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
}
```

## Logging & Debugging

### Development Logging

```typescript
// lib/utils/logger.ts

type LogLevel = "info" | "warn" | "error" | "debug";

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, error?: unknown, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
    // Send to error tracking service in production
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
```

### Usage

```typescript
import { logger } from "@/lib/utils/logger";

export async function submitForApproval(userId: string, eventId: string) {
  logger.info("Submitting event for approval", { userId, eventId });

  try {
    // ... logic
    logger.info("Event submitted successfully", { eventId });
  } catch (error) {
    logger.error("Failed to submit event", error, { userId, eventId });
    throw error;
  }
}
```

## Validation Error Formatting

### Format Zod Errors

```typescript
// lib/utils/validation.ts

import { z } from "zod";

export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join(".");
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join("; ");
}

export function getFirstZodError(error: z.ZodError): string {
  return error.errors[0]?.message || "Invalid input";
}
```

## Utility Functions

### Date Formatting

```typescript
// lib/utils/date.ts

import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatTime(time: string): string {
  // Convert "14:30" to "2:30 PM"
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isEventPast(eventDate: Date | string): boolean {
  return isPast(new Date(eventDate));
}

export function isEventUpcoming(eventDate: Date | string): boolean {
  return isFuture(new Date(eventDate));
}
```

### String Utilities

```typescript
// lib/utils/string.ts

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

export function kebabToTitle(str: string): string {
  return titleCase(str.replace(/-|_/g, " "));
}
```

### Number Formatting

```typescript
// lib/utils/number.ts

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}
```

## Best Practices

✅ **Do:**
- Use custom error classes for different error types
- Log errors with context (user ID, resource ID, etc.)
- Return user-friendly error messages
- Handle Zod errors separately from other errors
- Use ErrorBoundary to catch React errors
- Show toast notifications for user feedback
- Sanitize error messages before showing to users (no stack traces in production)
- Log errors to monitoring service in production
- Use consistent ActionResponse format

❌ **Don't:**
- Expose stack traces or internal details to users
- Swallow errors silently (always log)
- Use generic error messages ("Error occurred")
- Return different errors based on authorization (info leak)
- Throw errors in DAL layer (return null or throw database-specific errors)
- Skip error handling in Server Actions
- Forget to handle loading and error states in UI
- Use `console.log` in production code (use logger utility)

