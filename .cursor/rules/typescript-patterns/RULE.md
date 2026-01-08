---
description: TypeScript patterns for enums, type safety, and shared type definitions to ensure consistency across the application
alwaysApply: true
---

# TypeScript Patterns & Conventions

## Enums for Fixed Value Sets

### Core Principle

**Always create TypeScript enums** for any fixed set of values including:
- Status values (event status, approval status)
- User roles
- Action types
- Priority levels
- Any categorical data with fixed options

### Centralized Enum File

**Location:** `/lib/types/enums.ts`

All shared enums must be defined in this single file for easy maintenance and consistency.

```typescript
// lib/types/enums.ts

// User Roles
export enum UserRole {
  EVENT_PLANNER = "event_planner",
  CITY_CURATOR = "city_curator",
  REGIONAL_CURATOR = "regional_curator",
  LEAD_CURATOR = "lead_curator",
  GLOBAL_DIRECTOR = "global_director",
}

// Event Status
export enum EventStatus {
  DRAFT = "draft",
  IN_REVIEW = "in_review",
  REJECTED = "rejected",
  APPROVED_SCHEDULED = "approved_scheduled",
  COMPLETED_AWAITING_REPORT = "completed_awaiting_report",
  COMPLETED_ARCHIVED = "completed_archived",
  CANCELLED = "cancelled",
}

// Approval Status
export enum ApprovalStatus {
  WAITING = "waiting",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// Approval Type
export enum ApprovalType {
  EVENT = "event",
  MODIFICATION = "modification",
  CANCELLATION = "cancellation",
  REPORT = "report",
}

// Audit Action Type
export enum ActionType {
  CREATE_DRAFT = "create_draft",
  SUBMIT_FOR_APPROVAL = "submit_for_approval",
  APPROVE = "approve",
  REJECT = "reject",
  REQUEST_MODIFICATION = "request_modification",
  APPROVE_MODIFICATION = "approve_modification",
  REQUEST_CANCELLATION = "request_cancellation",
  APPROVE_CANCELLATION = "approve_cancellation",
  SUBMIT_REPORT = "submit_report",
  APPROVE_REPORT = "approve_report",
  UPDATE_EVENT = "update_event",
  CREATE_USER = "create_user",
  DEACTIVATE_USER = "deactivate_user",
  BAN_VENUE = "ban_venue",
}

// Priority Levels
export enum Priority {
  NONE = 0,
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}
```

### Naming Conventions

#### Enum Names (PascalCase)
```typescript
✅ export enum EventStatus { }
✅ export enum UserRole { }
✅ export enum ApprovalType { }

❌ export enum event_status { }
❌ export enum eventStatus { }
```

#### Enum Values (UPPER_SNAKE_CASE)
```typescript
✅ EVENT_PLANNER = "event_planner"
✅ APPROVED_SCHEDULED = "approved_scheduled"
✅ IN_REVIEW = "in_review"

❌ eventPlanner = "event_planner"
❌ Event_Planner = "event_planner"
❌ EVENTPLANNER = "event_planner"
```

#### Database Values (lowercase_snake_case)
```typescript
// Enum constant uses UPPER_SNAKE_CASE
// But the value (stored in database) is lowercase_snake_case
export enum EventStatus {
  APPROVED_SCHEDULED = "approved_scheduled",  // ✅ Correct
  APPROVED_SCHEDULED = "APPROVED_SCHEDULED",  // ❌ Wrong - database won't match
}
```

## Enum Helper Functions

### Required Helper Functions

Add these utility functions to `/lib/types/enums.ts`:

```typescript
// lib/types/enums.ts

/**
 * Check if a value is a valid enum value
 */
export function isValidEnumValue<T extends Record<string, string | number>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

/**
 * Convert enum to array of values (useful for dropdowns)
 */
export function enumToArray<T extends Record<string, string | number>>(
  enumObj: T
): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][];
}

/**
 * Convert enum to array of key-value pairs (useful for labeled dropdowns)
 */
export function enumToOptions<T extends Record<string, string>>(
  enumObj: T
): Array<{ value: T[keyof T]; label: string }> {
  return Object.entries(enumObj).map(([key, value]) => ({
    value: value as T[keyof T],
    label: formatEnumLabel(key),
  }));
}

/**
 * Format enum key to human-readable label
 */
export function formatEnumLabel(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get enum key from value
 */
export function getEnumKey<T extends Record<string, string | number>>(
  enumObj: T,
  value: T[keyof T]
): keyof T | undefined {
  return (Object.keys(enumObj) as Array<keyof T>).find(
    (key) => enumObj[key] === value
  );
}
```

### Usage Examples

```typescript
import { EventStatus, enumToArray, enumToOptions, isValidEnumValue } from "@/lib/types/enums";

// Validate enum value
const status = "draft";
if (isValidEnumValue(EventStatus, status)) {
  // TypeScript now knows status is EventStatus
  console.log(status); // Type: EventStatus
}

// Generate dropdown options
const statusOptions = enumToArray(EventStatus);
// ["draft", "in_review", "rejected", ...]

// Generate labeled options
const labeledOptions = enumToOptions(EventStatus);
// [
//   { value: "draft", label: "Draft" },
//   { value: "in_review", label: "In Review" },
//   { value: "rejected", label: "Rejected" },
//   ...
// ]
```

## Database Synchronization

### PostgreSQL Enum Types

When creating enums in TypeScript, create matching PostgreSQL enum types:

```sql
-- db/migrations/001_initial_schema.sql

CREATE TYPE user_role AS ENUM (
  'event_planner',
  'city_curator',
  'regional_curator',
  'lead_curator',
  'global_director'
);

CREATE TYPE event_status AS ENUM (
  'draft',
  'in_review',
  'rejected',
  'approved_scheduled',
  'completed_awaiting_report',
  'completed_archived',
  'cancelled'
);

CREATE TYPE approval_status AS ENUM (
  'waiting',
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE approval_type AS ENUM (
  'event',
  'modification',
  'cancellation',
  'report'
);

CREATE TYPE action_type AS ENUM (
  'create_draft',
  'submit_for_approval',
  'approve',
  'reject',
  'request_modification',
  'approve_modification',
  'request_cancellation',
  'approve_cancellation',
  'submit_report',
  'approve_report',
  'update_event',
  'create_user',
  'deactivate_user',
  'ban_venue'
);
```

### Using Enum Types in Tables

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  -- other columns
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status event_status NOT NULL DEFAULT 'draft',
  -- other columns
);

CREATE TABLE event_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  approver_id UUID REFERENCES users(id),
  approval_type approval_type NOT NULL,
  status approval_status NOT NULL DEFAULT 'waiting',
  -- other columns
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  action_type action_type NOT NULL,
  -- other columns
);
```

### Adding New Enum Values

When adding new values to an enum:

**1. Update TypeScript enum first:**
```typescript
// lib/types/enums.ts
export enum EventStatus {
  DRAFT = "draft",
  IN_REVIEW = "in_review",
  // ... existing values
  PENDING_PAYMENT = "pending_payment",  // ✅ New value
}
```

**2. Create database migration:**
```sql
-- db/migrations/005_add_pending_payment_status.sql
ALTER TYPE event_status ADD VALUE 'pending_payment';
```

**3. Update validation schemas:**
```typescript
// lib/validation/events.schema.ts
import { EventStatus, enumToArray } from "@/lib/types/enums";

export const eventStatusSchema = z.enum(
  enumToArray(EventStatus) as [string, ...string[]]
);
```

## Usage in Code

### ✅ Correct Usage

#### In Type Definitions
```typescript
import { EventStatus, UserRole } from "@/lib/types/enums";

interface Event {
  id: string;
  title: string;
  status: EventStatus;  // ✅ Use enum as type
  creator_role: UserRole;
}
```

#### In Validation Schemas
```typescript
import { z } from "zod";
import { EventStatus, UserRole, enumToArray } from "@/lib/types/enums";

export const createEventSchema = z.object({
  title: z.string(),
  status: z.enum(enumToArray(EventStatus) as [string, ...string[]]),
});

export const roleSchema = z.nativeEnum(UserRole);  // Alternative for enums
```

#### In Service Layer
```typescript
import { EventStatus, ActionType } from "@/lib/types/enums";

export async function submitForApproval(userId: string, eventId: string) {
  const event = await eventsDAL.findById(eventId);
  
  // ✅ Use enum values, not strings
  if (event.status !== EventStatus.DRAFT) {
    throw new Error(`Cannot submit event in ${event.status} status`);
  }
  
  await eventsDAL.update(eventId, { 
    status: EventStatus.IN_REVIEW  // ✅ Use enum
  });
  
  await auditService.log({
    action_type: ActionType.SUBMIT_FOR_APPROVAL,  // ✅ Use enum
    event_id: eventId,
    user_id: userId,
  });
}
```

#### In Components (Dropdowns)
```typescript
"use client";

import { Select } from "@/components/ui/select";
import { EventStatus, enumToOptions } from "@/lib/types/enums";

export function EventStatusFilter() {
  const statusOptions = enumToOptions(EventStatus);
  
  return (
    <Select>
      {statusOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );
}
```

#### In Comparisons
```typescript
import { EventStatus } from "@/lib/types/enums";

// ✅ Use enum
if (event.status === EventStatus.APPROVED_SCHEDULED) {
  // Do something
}

// ✅ Check multiple statuses
const completedStatuses = [
  EventStatus.COMPLETED_AWAITING_REPORT,
  EventStatus.COMPLETED_ARCHIVED,
];

if (completedStatuses.includes(event.status)) {
  // Event is completed
}
```

#### In Switch Statements
```typescript
import { EventStatus } from "@/lib/types/enums";

function getStatusColor(status: EventStatus): string {
  switch (status) {
    case EventStatus.DRAFT:
      return "gray";
    case EventStatus.IN_REVIEW:
      return "blue";
    case EventStatus.APPROVED_SCHEDULED:
      return "green";
    case EventStatus.REJECTED:
      return "red";
    case EventStatus.COMPLETED_AWAITING_REPORT:
      return "yellow";
    case EventStatus.COMPLETED_ARCHIVED:
      return "gray";
    case EventStatus.CANCELLED:
      return "red";
    default:
      // TypeScript will catch exhaustiveness
      const _exhaustive: never = status;
      return "gray";
  }
}
```

### ❌ Incorrect Usage

#### Don't Use String Literals
```typescript
// ❌ Wrong - using string literal
if (event.status === "approved_scheduled") {
  // ...
}

// ✅ Correct - use enum
if (event.status === EventStatus.APPROVED_SCHEDULED) {
  // ...
}
```

#### Don't Hardcode Values
```typescript
// ❌ Wrong - hardcoded array
const completedStatuses = ["completed_awaiting_report", "completed_archived"];

// ✅ Correct - use enum
const completedStatuses = [
  EventStatus.COMPLETED_AWAITING_REPORT,
  EventStatus.COMPLETED_ARCHIVED,
];
```

#### Don't Create Local Enums
```typescript
// ❌ Wrong - local enum in component
enum Status {
  DRAFT = "draft",
  IN_REVIEW = "in_review",
}

// ✅ Correct - import from central file
import { EventStatus } from "@/lib/types/enums";
```

## Type Guards with Enums

### Runtime Type Checking

```typescript
import { EventStatus, isValidEnumValue } from "@/lib/types/enums";

export function processEventStatus(status: unknown): void {
  // Validate before using
  if (!isValidEnumValue(EventStatus, status)) {
    throw new Error(`Invalid event status: ${status}`);
  }
  
  // TypeScript now knows status is EventStatus
  handleValidStatus(status);
}

function handleValidStatus(status: EventStatus): void {
  // Can safely use status here
  console.log(status);
}
```

### API Response Validation

```typescript
import { z } from "zod";
import { EventStatus, enumToArray } from "@/lib/types/enums";

// Validate API response
const eventResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(enumToArray(EventStatus) as [string, ...string[]]),
});

export async function fetchEvent(id: string) {
  const response = await fetch(`/api/events/${id}`);
  const data = await response.json();
  
  // Validate and get type-safe data
  const event = eventResponseSchema.parse(data);
  
  // event.status is now EventStatus type
  return event;
}
```

## Enum Documentation

### Adding JSDoc Comments

```typescript
/**
 * User roles in the hierarchical organization structure.
 * Roles determine permissions and approval chain position.
 */
export enum UserRole {
  /** Entry-level role - creates events, cannot approve */
  EVENT_PLANNER = "event_planner",
  
  /** City-level approval authority */
  CITY_CURATOR = "city_curator",
  
  /** Regional-level approval authority */
  REGIONAL_CURATOR = "regional_curator",
  
  /** Lead-level approval authority */
  LEAD_CURATOR = "lead_curator",
  
  /** Highest authority - can perform all actions */
  GLOBAL_DIRECTOR = "global_director",
}

/**
 * Event lifecycle status values.
 * Events progress through these states based on approval workflow.
 */
export enum EventStatus {
  /** Initial state - editable by creator */
  DRAFT = "draft",
  
  /** Submitted for approval - going through approval chain */
  IN_REVIEW = "in_review",
  
  /** Rejected by an approver - creator can create new from this */
  REJECTED = "rejected",
  
  /** Approved and scheduled - awaiting event date */
  APPROVED_SCHEDULED = "approved_scheduled",
  
  /** Event date passed - awaiting post-event report */
  COMPLETED_AWAITING_REPORT = "completed_awaiting_report",
  
  /** Report approved - event fully completed */
  COMPLETED_ARCHIVED = "completed_archived",
  
  /** Event was cancelled through approval process */
  CANCELLED = "cancelled",
}
```

## Testing with Enums

### Unit Test Examples

```typescript
import { EventStatus, UserRole, isValidEnumValue } from "@/lib/types/enums";

describe("Enum validation", () => {
  it("should validate correct enum values", () => {
    expect(isValidEnumValue(EventStatus, "draft")).toBe(true);
    expect(isValidEnumValue(EventStatus, EventStatus.DRAFT)).toBe(true);
  });

  it("should reject invalid enum values", () => {
    expect(isValidEnumValue(EventStatus, "invalid")).toBe(false);
    expect(isValidEnumValue(EventStatus, "DRAFT")).toBe(false);
  });

  it("should handle enum in business logic", () => {
    const event = { status: EventStatus.DRAFT };
    
    // Should allow submission
    expect(canSubmit(event.status)).toBe(true);
    
    event.status = EventStatus.IN_REVIEW;
    
    // Should not allow submission
    expect(canSubmit(event.status)).toBe(false);
  });
});
```

## Migration Strategy

### Converting Existing String Literals to Enums

**Step 1: Create enum**
```typescript
// lib/types/enums.ts
export enum EventStatus {
  DRAFT = "draft",
  // ... other values
}
```

**Step 2: Update type definitions**
```typescript
// Before
interface Event {
  status: string;
}

// After
interface Event {
  status: EventStatus;
}
```

**Step 3: Replace string literals in code**
```typescript
// Before
if (event.status === "draft") { }

// After
if (event.status === EventStatus.DRAFT) { }
```

**Step 4: Update validation schemas**
```typescript
// Before
z.enum(["draft", "in_review", "rejected"])

// After
z.nativeEnum(EventStatus)
```

## Best Practices Summary

✅ **Do:**
- Always use enums for fixed sets of values
- Keep all enums in `/lib/types/enums.ts`
- Use UPPER_SNAKE_CASE for enum keys
- Use lowercase_snake_case for enum values (database format)
- Sync TypeScript enums with database enum types
- Import enums, never use string literals
- Use helper functions for validation and dropdowns
- Add JSDoc comments to enum definitions
- Validate enum values at runtime when needed

❌ **Don't:**
- Use string literals instead of enums
- Create enums in multiple files
- Use inconsistent naming conventions
- Forget to sync database when adding enum values
- Hardcode enum values in arrays or objects
- Create duplicate enums for same concept
- Skip type guards when dealing with unknown values

## Quick Reference

```typescript
// Import
import { EventStatus, UserRole, enumToArray, enumToOptions, isValidEnumValue } from "@/lib/types/enums";

// Type annotation
status: EventStatus

// Comparison
if (status === EventStatus.DRAFT) { }

// Validation
if (isValidEnumValue(EventStatus, unknownValue)) { }

// Dropdown options
const options = enumToArray(EventStatus);
const labeled = enumToOptions(EventStatus);

// Validation schema
z.nativeEnum(EventStatus)
z.enum(enumToArray(EventStatus) as [string, ...string[]])
```

