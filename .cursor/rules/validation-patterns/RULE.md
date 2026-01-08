---
description: Input validation patterns using Zod schemas for type-safe validation across forms, Server Actions, and APIs
alwaysApply: true
---

# Validation & Type Safety Patterns

## Validation Library

**Use Zod for all validation:**
- Type-safe schemas
- Runtime validation
- Automatic TypeScript type inference
- Integration with react-hook-form
- Custom error messages

## Schema Organization

### File Structure

One file per domain in `/lib/validation/`:
```
/lib/validation
  users.schema.ts
  events.schema.ts
  venues.schema.ts
  approvals.schema.ts
  modifications.schema.ts
  cancellations.schema.ts
  reports.schema.ts
```

### Schema Naming Convention

```typescript
// lib/validation/events.schema.ts

// CREATE schemas: For insert operations
export const createEventSchema = z.object({ ... });

// UPDATE schemas: Partial of create schema
export const updateEventSchema = createEventSchema.partial();

// ACTION schemas: For specific actions
export const submitEventSchema = z.object({ eventId: z.string().uuid() });
export const approveEventSchema = z.object({
  eventId: z.string().uuid(),
  comment: z.string().min(1, "Comment is required"),
});

// Export TypeScript types
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
```

## Common Validation Patterns

### Basic Types

```typescript
import { z } from "zod";

// Strings
z.string()
z.string().min(1, "Required")
z.string().min(3, "Must be at least 3 characters")
z.string().max(255, "Must be less than 255 characters")
z.string().email("Invalid email address")
z.string().url("Invalid URL")
z.string().uuid("Invalid UUID")

// Numbers
z.number()
z.number().int("Must be an integer")
z.number().positive("Must be positive")
z.number().min(1, "Must be at least 1")
z.number().max(100, "Must be at most 100")

// Booleans
z.boolean()

// Dates
z.string().datetime() // ISO 8601 string
z.date() // JavaScript Date object
z.coerce.date() // Coerce string to Date

// Enums
z.enum(["draft", "in_review", "approved_scheduled"])
z.nativeEnum(EventStatus) // From TypeScript enum

// Optional & Nullable
z.string().optional()
z.string().nullable()
z.string().nullish() // optional + nullable
```

### Complex Patterns

#### Email Validation
```typescript
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .toLowerCase()
  .trim();
```

#### Date Validation
```typescript
// Event date must be in the future
export const eventDateSchema = z
  .string()
  .refine((date) => {
    return new Date(date) > new Date();
  }, "Event date must be in the future");
```

#### Time Validation
```typescript
// Time in HH:MM format
export const timeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)");
```

#### File Validation
```typescript
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 2 * 1024 * 1024, "File must be less than 2MB")
  .refine(
    (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "File must be JPEG, PNG, or WebP"
  );
```

#### Conditional Validation
```typescript
export const userSchema = z
  .object({
    role: z.enum(["event_planner", "city_curator", "regional_curator"]),
    parentId: z.string().uuid().optional(),
    city: z.string().optional(),
  })
  .refine(
    (data) => {
      // Event planners must have a parent
      if (data.role === "event_planner") {
        return !!data.parentId;
      }
      return true;
    },
    {
      message: "Event planners must have a parent assigned",
      path: ["parentId"],
    }
  );
```

#### Array Validation
```typescript
export const reportSchema = z.object({
  mediaUrls: z
    .array(z.string().url())
    .max(10, "Maximum 10 media files allowed"),
  externalLinks: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
      })
    )
    .optional(),
});
```

## Domain Schemas

### User Schema

```typescript
// lib/validation/users.schema.ts
import { z } from "zod";

export const roleEnum = z.enum([
  "event_planner",
  "city_curator",
  "regional_curator",
  "lead_curator",
  "global_director",
]);

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters")
    .trim(),
  role: roleEnum,
  parentId: z.string().uuid().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const deactivateUserSchema = z.object({
  userId: z.string().uuid(),
});

// For creating Global Director (requires password confirmation)
export const createGlobalDirectorSchema = createUserSchema
  .extend({
    confirmationPassword: z.string().min(1, "Password confirmation required"),
  })
  .refine((data) => data.role === "global_director", {
    message: "This schema is only for Global Director creation",
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type Role = z.infer<typeof roleEnum>;
```

### Event Schema

```typescript
// lib/validation/events.schema.ts
import { z } from "zod";

export const eventStatusEnum = z.enum([
  "draft",
  "in_review",
  "rejected",
  "approved_scheduled",
  "completed_awaiting_report",
  "completed_archived",
  "cancelled",
]);

export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  eventDate: z
    .string()
    .refine((date) => new Date(date) > new Date(), {
      message: "Event date must be in the future",
    }),
  eventTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  venueId: z.string().uuid("Please select a venue"),
  expectedAttendance: z
    .number()
    .int()
    .positive("Must be a positive number")
    .min(1, "Must expect at least 1 attendee"),
  budget: z
    .number()
    .nonnegative("Budget cannot be negative")
    .optional(),
  notes: z.string().max(2000).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const submitEventSchema = z.object({
  eventId: z.string().uuid(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventStatus = z.infer<typeof eventStatusEnum>;
```

### Approval Schema

```typescript
// lib/validation/approvals.schema.ts
import { z } from "zod";

export const approvalTypeEnum = z.enum([
  "event",
  "modification",
  "cancellation",
  "report",
]);

export const approvalStatusEnum = z.enum([
  "waiting",
  "pending",
  "approved",
  "rejected",
]);

export const approveEventSchema = z.object({
  eventId: z.string().uuid(),
  comment: z
    .string()
    .min(1, "Comment is required for approval")
    .max(1000, "Comment must be less than 1000 characters"),
});

export const rejectEventSchema = z.object({
  eventId: z.string().uuid(),
  comment: z
    .string()
    .min(10, "Please provide a detailed reason for rejection (minimum 10 characters)")
    .max(1000, "Comment must be less than 1000 characters"),
});

export type ApproveEventInput = z.infer<typeof approveEventSchema>;
export type RejectEventInput = z.infer<typeof rejectEventSchema>;
export type ApprovalType = z.infer<typeof approvalTypeEnum>;
export type ApprovalStatus = z.infer<typeof approvalStatusEnum>;
```

### Venue Schema

```typescript
// lib/validation/venues.schema.ts
import { z } from "zod";

export const createVenueSchema = z.object({
  name: z
    .string()
    .min(1, "Venue name is required")
    .max(255, "Name must be less than 255 characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address must be less than 500 characters"),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  capacity: z
    .number()
    .int()
    .positive("Capacity must be a positive number")
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
```

### Report Schema

```typescript
// lib/validation/reports.schema.ts
import { z } from "zod";

export const submitReportSchema = z.object({
  eventId: z.string().uuid(),
  attendanceCount: z
    .number()
    .int()
    .nonnegative("Attendance cannot be negative"),
  summary: z
    .string()
    .min(50, "Summary must be at least 50 characters")
    .max(5000, "Summary must be less than 5000 characters"),
  feedback: z.string().max(2000).optional(),
  externalLinks: z
    .array(
      z.object({
        title: z.string().min(1, "Link title is required"),
        url: z.string().url("Invalid URL"),
      })
    )
    .max(10, "Maximum 10 external links allowed")
    .optional(),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
```

## Validation in Server Actions

### Pattern: Validate FormData

```typescript
"use server";

import { z } from "zod";
import { createEventSchema } from "@/lib/validation/events.schema";
import type { ActionResponse } from "@/lib/types/api.types";

export async function createEventDraft(
  formData: FormData
): Promise<ActionResponse<Event>> {
  try {
    // 1. Parse FormData to object
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      eventDate: formData.get("eventDate"),
      eventTime: formData.get("eventTime"),
      venueId: formData.get("venueId"),
      expectedAttendance: Number(formData.get("expectedAttendance")),
      budget: formData.get("budget") ? Number(formData.get("budget")) : undefined,
      notes: formData.get("notes") || undefined,
    };

    // 2. Validate with Zod
    const validatedData = createEventSchema.parse(rawData);

    // 3. Call service layer
    const event = await draftService.createDraft(currentUser.id, validatedData);

    return { success: true, data: event };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return first validation error
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create draft",
    };
  }
}
```

### Pattern: Validate Object

```typescript
"use server";

import { createEventSchema } from "@/lib/validation/events.schema";
import type { ActionResponse } from "@/lib/types/api.types";
import type { CreateEventInput } from "@/lib/validation/events.schema";

export async function createEventDraft(
  data: CreateEventInput
): Promise<ActionResponse<Event>> {
  try {
    // Validate input
    const validatedData = createEventSchema.parse(data);

    // Call service
    const event = await draftService.createDraft(currentUser.id, validatedData);

    return { success: true, data: event };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      };
    }
    
    return {
      success: false,
      error: "Failed to create draft",
    };
  }
}
```

## Validation in React Hook Form

### Pattern: Client-side Validation

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventSchema, type CreateEventInput } from "@/lib/validation/events.schema";
import { createEventDraft } from "@/lib/actions/events";

export function EventForm() {
  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      expectedAttendance: 0,
    },
  });

  async function onSubmit(data: CreateEventInput) {
    const result = await createEventDraft(data);
    
    if (result.success) {
      toast.success("Draft created");
    } else {
      // Show error from server
      form.setError("root", {
        message: result.error,
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("title")} />
      {form.formState.errors.title && (
        <p className="text-red-500">{form.formState.errors.title.message}</p>
      )}
      
      {/* Root error from server */}
      {form.formState.errors.root && (
        <p className="text-red-500">{form.formState.errors.root.message}</p>
      )}
      
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

## Custom Error Messages

### Field-level Messages

```typescript
export const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Please enter an event title")
    .max(255, "Title is too long (maximum 255 characters)"),
  expectedAttendance: z
    .number({
      required_error: "Expected attendance is required",
      invalid_type_error: "Expected attendance must be a number",
    })
    .int("Expected attendance must be a whole number")
    .positive("Expected attendance must be greater than 0"),
});
```

### Schema-level Refinements

```typescript
export const modificationSchema = z
  .object({
    eventId: z.string().uuid(),
    changes: updateEventSchema,
  })
  .refine(
    async (data) => {
      // Check if event has pending modification
      const hasPending = await hasPendingModification(data.eventId);
      return !hasPending;
    },
    {
      message: "This event already has a pending modification request",
      path: ["eventId"],
    }
  );
```

## Best Practices

✅ **Do:**
- Validate all inputs at entry points (Server Actions, Route Handlers)
- Use Zod for both client and server validation
- Provide clear, user-friendly error messages
- Use `.parse()` for Server Actions (throws on error)
- Use `.safeParse()` when you want to handle errors manually
- Export TypeScript types from schemas
- Create reusable sub-schemas for common patterns
- Use conditional validation with `.refine()` when needed
- Validate file uploads (size, type, etc.)

❌ **Don't:**
- Skip validation on server side (client validation can be bypassed)
- Use generic error messages ("Invalid input")
- Validate in multiple places (DRY - use shared schemas)
- Forget to validate nested objects and arrays
- Ignore Zod type inference (use `z.infer<>`)
- Use `any` type - let Zod infer types
- Create huge monolithic schemas (split by domain)

