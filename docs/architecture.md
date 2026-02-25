# Event Management Platform - Architecture

This document describes the technical architecture of the hierarchical event management platform.

---

## Table of Contents

1. [Backend Architecture](#backend-architecture)
2. [Authentication Architecture](#authentication-architecture)
3. [Database Schema](#database-schema)
4. [API Patterns](#api-patterns)

---

## Backend Architecture

### 3-Layer Architecture

The backend follows a strict 3-layer architecture pattern:

1. **Data Access Layer (DAL)** - `/lib/data-access/*.dal.ts`
   - Pure database operations
   - No business logic
   - Returns raw database results

2. **Service Layer** - `/lib/services/*/*.service.ts`
   - Business logic orchestration
   - Authorization checks
   - Data transformation
   - Calls DAL functions

3. **Entry Points**:
   - **Route Handlers** - `/app/api/*/route.ts` - Public HTTP endpoints only

### Response Format

All server actions return standardized `ActionResponse<T>`:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Authentication Architecture

### Invitation-Based Authentication System

The platform uses an invitation-only authentication system. Magic link authentication is disabled for all users.

#### User Status Enum

Users have a `status` field with three possible values:

- `pending` - User has registered but is awaiting Global Director activation
- `active` - User can log in and use the platform
- `inactive` - User has been deactivated by Global Director

#### Authentication Flow

**Step 1: Global Director Creates Invitation**

- Global Director selects country (REQUIRED)
- Creates invitation with:
  - Email address
  - Country ID (from selection)
  - Expiration (default: 7 days)
- System generates secure token
- Sends invitation email via Supabase email service
- Invitation link: `/auth/register?token={token}`

**Step 2: User Registration**

- User clicks invitation link
- System validates token (not expired, not used)
- Registration form:
  - Email (pre-filled, locked)
  - Country (pre-filled from invitation, locked)
  - Name (required)
  - Phone (optional, E.164 format)
  - Company (optional)
  - Password (required, min 8 characters)
- On submit:
  - Creates Supabase Auth user with password
  - Creates user record (status: pending)
  - Marks invitation as used
  - Sends congratulation email

**Step 3: Global Director Activates User**

- Global Director views pending users
- Clicks "Activate" button
- Assigns:
  - Role (Event Planner, City Curator, Regional Curator, Lead Curator)
  - Parent (if role requires it)
  - Country/State/City
- Updates user status to 'active'
- User can now log in

#### Direct User Creation

Global Directors can also create users directly (bypassing invitation):

- Fill complete user form including password
- User is immediately active (status: 'active')
- Sends congratulation email
- User can log in immediately

#### Login

- Email/password authentication only
- Magic link authentication disabled
- Users must have status = 'active' to log in
- Pending users see "awaiting activation" message
- Inactive users see "account deactivated" message

### Invitations Table Structure

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES locations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**

- Token is cryptographically secure (32+ characters, Base64URL)
- Country is required and stored in invitation
- Single-use (marked as used after registration)
- Time-limited (expires_at timestamp)
- Tracks creator for audit purposes

### Users Table Updates

Added fields:

- `phone` TEXT (optional, E.164 format validation)
- `company` TEXT (optional)
- `status` user_status enum (pending, active, inactive)

---

## Database Schema

### Invitations Table

See [Authentication Architecture](#authentication-architecture) for invitations table structure.

### User Status Enum

```sql
CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive');
```

### Status Transitions

- `pending` → `active` (Global Director activation)
- `active` → `inactive` (Global Director deactivation)
- `inactive` → `active` (Global Director reactivation)

---

## API Patterns

### Server Actions Pattern

All mutations use server actions:

```typescript
"use server";

export async function createInvitation(
  formData: FormData | CreateInvitationInput
): Promise<ActionResponse<Invitation>> {
  return handleAsync(async () => {
    const user = await requireRole(["global_director"]);
    // ... business logic
    return result;
  }, "createInvitation");
}
```

### Route Handlers Pattern

Route handlers are only for public HTTP endpoints:

```typescript
export async function GET(request: NextRequest) {
  // Public endpoint logic
  return NextResponse.json(data);
}
```

---

## Email Service

### Supabase Email Integration

All emails are sent via Supabase email service:

- Invitation emails
- Registration congratulation emails
- User created congratulation emails

### Email Templates

Templates are rendered in `/lib/services/email/templates.service.ts`:

- HTML email templates
- Branded headers and footers
- Call-to-action buttons
- Responsive design

---

## Security Considerations

- Invitation tokens are single-use and time-limited
- Passwords are hashed using Supabase Auth
- Magic link authentication disabled for ALL users
- All user creation requires Global Director permission
- Invitation links are country-bound (enforced in registration)
- Country must be assigned before invitation creation
- User status must be 'active' to access the platform
