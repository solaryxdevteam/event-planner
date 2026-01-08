---
description: Authorization patterns for hierarchical pyramid visibility and role-based permissions in the event management system
alwaysApply: true
---

# Permissions & Authorization Patterns

## Hierarchical Roles

### Role Hierarchy (Bottom to Top)

```
Event Planner (Level 1)
    ↓ reports to
City Curator (Level 2)
    ↓ reports to
Regional Curator (Level 3)
    ↓ reports to
Lead Curator (Level 4)
    ↓ reports to
Global Director (Level 5)
```

### Role Definitions

```typescript
// lib/permissions/roles.ts

export enum Role {
  EventPlanner = "event_planner",
  CityCurator = "city_curator",
  RegionalCurator = "regional_curator",
  LeadCurator = "lead_curator",
  GlobalDirector = "global_director",
}

export const ROLE_LEVELS: Record<Role, number> = {
  [Role.EventPlanner]: 1,
  [Role.CityCurator]: 2,
  [Role.RegionalCurator]: 3,
  [Role.LeadCurator]: 4,
  [Role.GlobalDirector]: 5,
};

export function getRoleLevel(role: Role): number {
  return ROLE_LEVELS[role];
}

export function hasHigherRole(userRole: Role, targetRole: Role): boolean {
  return getRoleLevel(userRole) > getRoleLevel(targetRole);
}
```

## Pyramid Visibility Pattern

### Core Principle

**Users can only see:**
1. Their own data
2. Data from their direct and indirect subordinates

**Users CANNOT see:**
- Data from peers at the same level
- Data from superiors
- Data from other branches of the hierarchy

### Implementation

```typescript
// lib/permissions/pyramid.ts

import { usersDAL } from "@/lib/data-access/users.dal";
import { eventsDAL } from "@/lib/data-access/events.dal";

/**
 * Get all user IDs visible to a user (self + subordinates)
 * Uses database function: get_subordinate_user_ids()
 */
export async function getVisibleUserIds(userId: string): Promise<string[]> {
  // This uses the PostgreSQL recursive CTE function
  const result = await usersDAL.getSubordinateIds(userId);
  return result;
}

/**
 * Check if userId can view targetUserId's data
 */
export async function canViewUser(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  if (userId === targetUserId) return true;
  
  const visibleIds = await getVisibleUserIds(userId);
  return visibleIds.includes(targetUserId);
}

/**
 * Check if userId can view an event
 */
export async function canViewEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const event = await eventsDAL.findById(eventId);
  if (!event) return false;
  
  // Event creator is in user's visible hierarchy
  const canViewCreator = await canViewUser(userId, event.creator_id);
  if (canViewCreator) return true;
  
  // User is in event's approval chain
  const approvals = await approvalsDAL.findByEventId(eventId);
  const isApprover = approvals.some((a) => a.approver_id === userId);
  
  return isApprover;
}

/**
 * Check if userId can edit an event
 */
export async function canEditEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const event = await eventsDAL.findById(eventId);
  if (!event) return false;
  
  // Only the creator can edit (unless Global Director)
  if (event.creator_id === userId) return true;
  
  // Global Director can edit anything
  const user = await usersDAL.findById(userId);
  return user?.role === Role.GlobalDirector;
}

/**
 * Check if userId can approve an event
 */
export async function canApproveEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const approvals = await approvalsDAL.findByEventId(eventId);
  
  // Find user's approval record
  const userApproval = approvals.find((a) => a.approver_id === userId);
  
  // User must be in approval chain and status must be 'pending'
  return userApproval?.status === "pending";
}
```

## Permission Guards

### Throwing Permission Errors

```typescript
// lib/permissions/guards.ts

import { AppError } from "@/lib/utils/errors";

export class PermissionError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, 403);
  }
}

/**
 * Require user can view event (throws if not)
 */
export async function requireCanViewEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const canView = await canViewEvent(userId, eventId);
  if (!canView) {
    throw new PermissionError("You don't have permission to view this event");
  }
}

/**
 * Require user can edit event (throws if not)
 */
export async function requireCanEditEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const canEdit = await canEditEvent(userId, eventId);
  if (!canEdit) {
    throw new PermissionError("You don't have permission to edit this event");
  }
}

/**
 * Require user can approve event (throws if not)
 */
export async function requireCanApprove(
  userId: string,
  eventId: string
): Promise<void> {
  const canApprove = await canApproveEvent(userId, eventId);
  if (!canApprove) {
    throw new PermissionError("You don't have permission to approve this event");
  }
}

/**
 * Require user has specific role
 */
export async function requireRole(
  userId: string,
  allowedRoles: Role[]
): Promise<void> {
  const user = await usersDAL.findById(userId);
  if (!user || !allowedRoles.includes(user.role as Role)) {
    throw new PermissionError(
      `This action requires one of these roles: ${allowedRoles.join(", ")}`
    );
  }
}

/**
 * Require user is Global Director
 */
export async function requireGlobalDirector(userId: string): Promise<void> {
  await requireRole(userId, [Role.GlobalDirector]);
}
```

## Authorization in Service Layer

### Pattern: Check Permissions First

```typescript
// lib/services/events/event.service.ts

import { requireCanViewEvent, requireCanEditEvent } from "@/lib/permissions/guards";
import { getVisibleUserIds } from "@/lib/permissions/pyramid";

export async function getEventById(
  requesterId: string,
  eventId: string
): Promise<Event> {
  // 1. Check permissions
  await requireCanViewEvent(requesterId, eventId);
  
  // 2. Fetch data
  const event = await eventsDAL.findById(eventId);
  
  if (!event) {
    throw new AppError("Event not found", 404);
  }
  
  return event;
}

export async function updateEvent(
  requesterId: string,
  eventId: string,
  updates: UpdateEventInput
): Promise<Event> {
  // 1. Check permissions
  await requireCanEditEvent(requesterId, eventId);
  
  // 2. Update event
  const updated = await eventsDAL.update(eventId, updates);
  
  // 3. Log audit trail
  await auditService.log({
    event_id: eventId,
    user_id: requesterId,
    action_type: "update_event",
    metadata: { changes: updates },
  });
  
  return updated;
}

export async function getEventsForUser(
  requesterId: string,
  filters: EventFilters
): Promise<Event[]> {
  // 1. Get visible user IDs (pyramid visibility)
  const visibleUserIds = await getVisibleUserIds(requesterId);
  
  // 2. Fetch events created by visible users
  const events = await eventsDAL.findByCreatorIds(visibleUserIds, filters);
  
  return events;
}
```

## Role-Based Operations

### User Management (Global Director Only)

```typescript
// lib/services/users/user.service.ts

export async function createUser(
  requesterId: string,
  data: CreateUserInput
): Promise<User> {
  // Only Global Director can create users
  await requireGlobalDirector(requesterId);
  
  // Extra confirmation for creating another Global Director
  if (data.role === Role.GlobalDirector) {
    // Require password confirmation (handled in validation)
    await confirmGlobalDirectorCreation(data.confirmationPassword);
  }
  
  // Create user
  const user = await usersDAL.insert(data);
  
  // Send magic link
  await emailService.sendMagicLink(user.email);
  
  // Log audit
  await auditService.log({
    user_id: requesterId,
    action_type: "create_user",
    metadata: { created_user_id: user.id, role: user.role },
  });
  
  return user;
}
```

### Venue Banning (Global Director Only)

```typescript
// lib/services/venues/venue.service.ts

export async function banVenue(
  requesterId: string,
  venueId: string
): Promise<void> {
  // Only Global Director can ban venues globally
  await requireGlobalDirector(requesterId);
  
  // Soft delete venue
  await venuesDAL.softDelete(venueId);
  
  // Log audit
  await auditService.log({
    user_id: requesterId,
    action_type: "ban_venue",
    metadata: { venue_id: venueId },
  });
}
```

### Cancellation Requests (Configurable)

```typescript
// lib/services/cancellations/cancellation.service.ts

export async function canRequestCancellation(
  userId: string,
  eventId: string
): Promise<boolean> {
  const event = await eventsDAL.findById(eventId);
  if (!event) return false;
  
  // Get approval config
  const config = await approvalConfigsDAL.getLatest();
  
  // Check if user's role is allowed to request cancellation
  const user = await usersDAL.findById(userId);
  if (!user) return false;
  
  const allowedRoles = config.cancellation_request_roles || [Role.GlobalDirector];
  
  // Event creator can always request
  if (event.creator_id === userId) return true;
  
  // Check if role is in allowed list
  return allowedRoles.includes(user.role as Role);
}

export async function requestCancellation(
  requesterId: string,
  eventId: string,
  reason: string
): Promise<void> {
  // Check permission
  const canRequest = await canRequestCancellation(requesterId, eventId);
  if (!canRequest) {
    throw new PermissionError("You don't have permission to request cancellation");
  }
  
  // Create cancellation request
  // ... rest of logic
}
```

## Frontend Permission Checks

### Conditional Rendering

```typescript
// components/events/EventActions.tsx
"use client";

import { usePermissions } from "@/hooks/usePermissions";

export function EventActions({ event }: { event: Event }) {
  const { canEdit, canApprove, canRequestCancellation } = usePermissions(event.id);

  return (
    <div>
      {canEdit && (
        <Button onClick={handleEdit}>Edit Event</Button>
      )}
      
      {canApprove && (
        <Button onClick={handleApprove}>Approve</Button>
      )}
      
      {canRequestCancellation && (
        <Button variant="destructive" onClick={handleCancelRequest}>
          Request Cancellation
        </Button>
      )}
    </div>
  );
}
```

### Permission Hook

```typescript
// hooks/usePermissions.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { checkPermissions } from "@/lib/actions/permissions";

export function usePermissions(eventId: string) {
  const { data } = useQuery({
    queryKey: ["permissions", eventId],
    queryFn: () => checkPermissions(eventId),
  });

  return {
    canView: data?.canView ?? false,
    canEdit: data?.canEdit ?? false,
    canApprove: data?.canApprove ?? false,
    canRequestModification: data?.canRequestModification ?? false,
    canRequestCancellation: data?.canRequestCancellation ?? false,
  };
}
```

### Permission Server Action

```typescript
// lib/actions/permissions.ts
"use server";

import { getServerUser } from "@/lib/auth/server";
import * as pyramid from "@/lib/permissions/pyramid";
import type { ActionResponse } from "@/lib/types/api.types";

export async function checkPermissions(
  eventId: string
): Promise<ActionResponse<PermissionSet>> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const permissions = {
      canView: await pyramid.canViewEvent(user.id, eventId),
      canEdit: await pyramid.canEditEvent(user.id, eventId),
      canApprove: await pyramid.canApproveEvent(user.id, eventId),
      canRequestModification: await pyramid.canEditEvent(user.id, eventId),
      canRequestCancellation: await cancellationService.canRequestCancellation(
        user.id,
        eventId
      ),
    };

    return { success: true, data: permissions };
  } catch (error) {
    return { success: false, error: "Failed to check permissions" };
  }
}
```

## Database-Level Security (RLS)

### Pyramid Visibility in RLS Policies

```sql
-- Users can only SELECT their own data + subordinates
CREATE POLICY "users_select_pyramid" ON users
FOR SELECT
USING (
  auth.uid() = id
  OR id = ANY(get_subordinate_user_ids(auth.uid()))
);

-- Events can only be SELECTed if creator is in visible hierarchy
CREATE POLICY "events_select_pyramid" ON events
FOR SELECT
USING (
  creator_id = ANY(get_subordinate_user_ids(auth.uid()))
  OR auth.uid() IN (
    SELECT approver_id FROM event_approvals WHERE event_id = events.id
  )
);
```

## Best Practices

✅ **Do:**
- Check permissions in Service Layer (never in DAL)
- Use permission guards that throw errors
- Filter data by pyramid visibility
- Check permissions before showing UI elements
- Log all permission-sensitive actions
- Use RLS as defense in depth (not primary authorization)
- Cache permission checks when appropriate
- Provide clear permission error messages

❌ **Don't:**
- Skip permission checks in Service Layer
- Rely solely on frontend permission checks (always validate server-side)
- Expose data through unprotected API endpoints
- Hard-code role checks everywhere (use centralized functions)
- Allow bypass for "admin" without explicit check
- Return different errors based on permission (info leak)
- Check permissions in Client Components only

