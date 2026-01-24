# Hierarchical Event Management Platform - Complete Implementation Plan

## 5-Week MVP Goal

Deliver working demonstration with complete database, backend (3-layer architecture), and frontend for all features. Desktop-focused polished UI. Defer accessibility, mobile optimization, performance tuning, and security hardening to post-MVP.

## Authentication System

**IMPORTANT:** Authentication has been overhauled to use invitation-based system. See separate plan: `invitation-based_authentication_system.plan.md`

Key changes:

- Magic link authentication disabled for ALL users
- Invitation-only registration (country-bound, single-use, time-limited)
- Global Directors create invitations (country required) or directly create users
- Users register with password (country pre-filled and locked)
- Global Directors activate users and assign roles
- Email service uses Supabase email

---

## Backend Architecture Pattern

**3-Layer Architecture:**

1. **Data Access Layer (DAL)** - `/lib/data-access/*.dal.ts` - Pure database operations
2. **Service Layer** - `/lib/services/*/*.service.ts` - Business logic orchestration
3. **Entry Points:**

- **Server Actions** - `/lib/actions/*.ts` - Form submissions, UI mutations
- **Route Handlers** - `/app/api/*/route.ts` - Public HTTP endpoints only

**Response Format:** `{ success: boolean, data?: T, error?: string }`---

## Complete Backend File Structure

```javascript
/app
  /api                          # Route Handlers (webhooks, exports only)
    /webhooks
      /supabase-auth/route.ts
    /export
      /events/route.ts
    /users
      /hierarchy/route.ts

/lib
  /actions                      # Server Actions
    /users.ts
    /events.ts
    /approvals.ts
    /modifications.ts
    /cancellations.ts
    /venues.ts
    /templates.ts
    /reports.ts
    /profile.ts
    /dashboard.ts
  
  /services                     # Business Logic
    /users
      /user.service.ts
      /hierarchy.service.ts
    /events
      /event.service.ts
      /draft.service.ts
    /approvals
      /approval.service.ts
      /chain-builder.service.ts
    /modifications
      /modification.service.ts
    /cancellations
      /cancellation.service.ts
    /venues
      /venue.service.ts
    /reports
      /report.service.ts
    /audit
      /audit.service.ts
    /email
      /email.service.ts
    /storage
      /storage.service.ts
  
  /data-access                  # Database Queries
    /users.dal.ts
    /events.dal.ts
    /event-versions.dal.ts
    /event-approvals.dal.ts
    /venues.dal.ts
    /audit-logs.dal.ts
    /templates.dal.ts
    /approval-configs.dal.ts
  
  /auth                         # Auth utilities
    /server.ts
    /client.ts
  
  /permissions                  # Authorization
    /pyramid.ts
    /roles.ts
  
  /supabase                     # Clients
    /client.ts
    /server.ts
  
  /validation                   # Zod schemas
    /users.schema.ts
    /events.schema.ts
    /venues.schema.ts
    /approvals.schema.ts
    /reports.schema.ts
  
  /types                        # TypeScript types
    /database.types.ts
    /api.types.ts
  
  /utils                        # Utilities
    /response.ts
    /errors.ts
    /date.ts

/db
  /migrations
    /001_initial_schema.sql
  /triggers
    /audit_log_trigger.sql
    /updated_at_trigger.sql
    /auto_status_transition.sql

  /seed.sql
```

## Frontend Structure

```javascript
/app
  /(auth)
    /login
      /page.tsx               # Login page
  
  /(dashboard)                # Protected routes group
    /layout.tsx               # Dashboard layout with nav
    
    /dashboard
      /page.tsx               # Main dashboard
    
    /events
      /new
        /page.tsx             # Event creation form
      /current
        /page.tsx             # Current events list
      /past
        /page.tsx             # Past events list
      /requests
        /page.tsx             # Event requests (drafts/review/rejected)
      /[id]
        /page.tsx             # Event detail page
    
    /approvals
      /page.tsx               # Approvals dashboard
    
    /venues
      /page.tsx               # Venues list
    
    /profile
      /page.tsx               # Profile & settings
    
    /admin
      /users
        /page.tsx             # User management (Global Director)

/components
  /ui                         # shadcn/ui components
    /button.tsx
    /input.tsx
    /select.tsx
    /dialog.tsx
    /card.tsx
    /table.tsx
    /badge.tsx
    /avatar.tsx
    /calendar.tsx
    /toast.tsx
    /skeleton.tsx
    /alert-dialog.tsx
    # ... other shadcn components
  
  /auth
    /LoginForm.tsx
    /AuthProvider.tsx
  
  /users
    /UserTable.tsx
    /UserFormDialog.tsx
    /HierarchyTree.tsx
    /UserActions.tsx
  
  /profile
    /AvatarUpload.tsx
    /ProfileForm.tsx
    /NotificationSettings.tsx
  
  /venues
    /VenueTable.tsx
    /VenueFormDialog.tsx
    /VenueActions.tsx
    /VenueSelect.tsx          # Used in event forms
  
  /events
    /EventCard.tsx
    /EventTable.tsx
    /EventList.tsx
    /EventFormSteps.tsx
    /EventFilters.tsx
    /EventActions.tsx
    /DraftDialog.tsx
    /RequestModificationButton.tsx
    /ModificationForm.tsx
    /ModificationDiff.tsx
    /RequestCancellationButton.tsx
    /CancellationDialog.tsx
  
  /approvals
    /ApprovalList.tsx
    /ApprovalCard.tsx
    /ApprovalDialog.tsx
    /ApprovalChainProgress.tsx
  
  /reports
    /ReportForm.tsx
    /MediaUploader.tsx
    /ReportViewer.tsx
    /ReportApprovalCard.tsx
  
  /templates
    /TemplateSelector.tsx
    /SaveTemplateDialog.tsx
  
  /audit
    /AuditTimeline.tsx
    /AuditFilters.tsx
    /VersionCompare.tsx
  
  /dashboard
    /StatCard.tsx
    /ActivityFeed.tsx
  
  /calendar
    /EventCalendar.tsx
    /CalendarEvent.tsx
  
  /layout
    /Sidebar.tsx
    /Header.tsx
    /Navigation.tsx
  
  /shared
    /ErrorBoundary.tsx
    /LoadingSpinner.tsx
    /ConfirmDialog.tsx
    /PageHeader.tsx
    /EmptyState.tsx

/hooks
  /useAuth.ts
  /usePermissions.ts
  /useUser.ts
  /useToast.ts

/docs
  /architecture.md
  /database-schema.md
  /api-patterns.md
  /backend-structure.md
  /frontend-structure.md
  /workflows.md
```

---

# SPRINT IMPLEMENTATION PLAN

## Sprint Overview

- **Sprint Duration:** 2 weeks each
- **Team:** 2 developers (pair programming)
- **Capacity:** 6 hours/day × 5 days/week = 60 hours/week total
- **Total Sprints:** 3 sprints (~5.5 weeks total for MVP)

---

# SPRINT 1: Foundation & Core Infrastructure (Weeks 1-2)

**Sprint Goal:** Set up project infrastructure, database, authentication, and user management**Sprint Capacity:** 120 hours

## Sprint 1 Tasks (Linear Order)

### Task 1.1: Design Research & Wireframing (8 hours)

**Assignee:** Developer 1 & 2 (pair)**Estimated:** 1 day**Description:** Research UI patterns and create basic wireframes**Activities:**

- Review 3 modern admin dashboards (Linear, Notion, Retool)
- Identify common patterns: navigation, forms, tables, approval workflows
- Sketch wireframes for 8 key screens:
- Login with email/password (invitation-based registration)
- Main dashboard with calendar
- Event creation form (multi-step)
- Event list with filters
- Approvals dashboard with tabs
- User management table
- Venues list
- Profile settings

**Acceptance Criteria:**

- [ ] Wireframes completed for all 8 screens
- [ ] Common UI patterns documented
- [ ] Navigation flow defined

---

### Task 1.2: Design System Definition (4 hours)

**Assignee:** Developer 1 & 2 (pair)**Estimated:** 0.5 day**Description:** Define design system tokens and principles**Activities:**

- Color palette: Primary (blue), Secondary (gray), Success (green), Warning (yellow), Error (red), Neutral grays
- Use shadcn/ui default theme
- Typography: Default system fonts
- Spacing: Tailwind default scale (4px increments)

**Acceptance Criteria:**

- [ ] Color palette defined
- [ ] Typography scale documented
- [ ] Spacing system documented
- [ ] Decision to use shadcn/ui defaults confirmed

---

### Task 1.3: Project Configuration Files (8 hours)

**Assignee:** Developer 1 & 2 (pair)**Estimated:** 1 day**Description:** Create configuration files and documentation structure**Files to Create:**

- `.cursorrules`
- `/docs/architecture.md`
- `/docs/database-schema.md`
- `/docs/api-patterns.md`
- `/docs/backend-structure.md`
- `/docs/frontend-structure.md`
- `/docs/workflows.md`

**Activities:**

- Create `.cursorrules` defining:
- Backend: Server Actions for mutations, Route Handlers for public HTTP only
- 3-layer architecture (DAL → Service → Actions)
- Frontend: Server components default, "use client" only when needed
- Naming conventions: `*.dal.ts`, `*.service.ts`
- Validation: Zod on all inputs
- Response format: `ActionResponse<T>`
- Create documentation structure
- Configure MCP if available

**Acceptance Criteria:**

- [ ] `.cursorrules` file created with all patterns
- [ ] All documentation files created with structure
- [ ] Architecture diagrams added to docs
- [ ] Backend and frontend structures documented

---

### Task 1.4: Next.js Initialization (8 hours)

**Assignee:** Developer 1 & 2 (pair)**Estimated:** 1 day**Description:** Initialize Next.js project with all dependencies**Activities:**

- Run: `npx create-next-app@latest --api`
- Select: App Router, TypeScript, Tailwind CSS, ESLint
- Install dependencies:
- `@supabase/supabase-js @supabase/ssr`
- `@tanstack/react-query`
- `react-hook-form @hookform/resolvers`
- `zod`
- `date-fns`
- `lucide-react`
- `sonner` (toast notifications)
- Run: `npx shadcn-ui@latest init`
- Create complete folder structure (all directories from structure above)
- Create base utility files:
- `/lib/types/api.types.ts` - `ActionResponse` type
- `/lib/utils/response.ts` - Helper functions
- `/lib/utils/errors.ts` - `AppError` class
- Set up `.env.local` with Supabase keys

**Acceptance Criteria:**

- [ ] Next.js 16 initialized with App Router and TypeScript
- [ ] All dependencies installed successfully
- [ ] Complete folder structure created
- [ ] Base utility files created
- [ ] Environment variables configured
- [ ] shadcn/ui initialized

---

### Task 1.5: Database Schema Creation (16 hours)

**Assignee:** Developer 1**Estimated:** 2 days**Parallel with:** Task 1.6**Description:** Create complete database schema with tables, enums, and relationships**Files to Create:**

- `/db/migrations/001_initial_schema.sql`

**Activities:**Create all tables:

- **users:** id, email, name, role (enum), parent_id (self-reference), city, region, is_active, avatar_url, notification_prefs (jsonb), created_at, updated_at
- **events:** id, title, description, event_date, event_time, venue_id, creator_id, status (enum), expected_attendance, budget, notes, created_at, updated_at
- **event_versions:** id, event_id, version_data (jsonb), status, created_at
- **event_approvals:** id, event_id, approver_id, approval_type (enum: event, modification, cancellation, report), status (enum), comment, sequence_order, created_at, updated_at
- **venues:** id, name, address, city, capacity, notes, creator_id, is_active, created_at, updated_at
- **audit_logs:** id, event_id, user_id, action_type, comment, metadata (jsonb), created_at
- **templates:** id, user_id, name, template_data (jsonb), created_at
- **approval_configs:** id, config_data (jsonb), created_at, updated_at

Enums:

- role: event_planner, city_curator, regional_curator, lead_curator, global_director
- event_status: draft, in_review, rejected, approved_scheduled, completed_awaiting_report, completed_archived, cancelled
- approval_status: waiting, pending, approved, rejected
- approval_type: event, modification, cancellation, report
- action_type: create_draft, submit_for_approval, approve, reject, request_modification, approve_modification, request_cancellation, approve_cancellation, submit_report, approve_report

### 1.2: PostgreSQL Functions & Triggers

**Files:** `/db/functions/`, `/db/triggers/`

- `get_subordinate_user_ids(user_id uuid)` - Recursive CTE returning array of subordinate user IDs
- `build_approval_chain(user_id uuid)` - Returns array of approver IDs walking up hierarchy
- Trigger: `updated_at_trigger` - Auto-update updated_at on all tables
- Trigger: `audit_log_trigger` - Auto-insert audit log on event state changes

### 1.4: Supabase Client Configuration

**Files:** `/lib/supabase/server.ts`, `/lib/supabase/client.ts`

- Server client: Uses cookies, for Server Components and Server Actions
- Client client: For Client Components
- Both configured with proper type safety

### 1.5: Authentication Utilities - Backend

**NOTE:** Authentication system has been overhauled. See `invitation-based_authentication_system.plan.md` for complete implementation.

**Files:** `/lib/auth/server.ts`, `/lib/auth/client.ts`

Functions:

- `getServerUser()` - Get current user server-side (checks status='active')
- `requireAuth()` - Throw error if not authenticated or status not 'active'
- `requireRole(roles[])` - Check user has required role
- `signInWithEmailPassword(email, password)` - Email/password authentication
- `signOut()` - Sign out user

**Changes:**

- Magic link authentication disabled
- Email/password authentication only
- User status enum (pending, active, inactive)

### 1.6: Authentication UI - Frontend

**NOTE:** Authentication UI has been overhauled. See `invitation-based_authentication_system.plan.md` for complete implementation.

**Files:** `/app/auth/login/page.tsx`, `/app/auth/register/[token]/page.tsx`, `/lib/auth/AuthProvider.tsx`

- Login page: Email/password form (magic link disabled)
- Registration page: Invitation token-based registration form (country pre-filled and locked)
- Auth Provider: React Context for auth state, subscribe to auth changes
- Wrap app in AuthProvider in root layout

### 1.7: Seed Data

**File:** `/db/seed.sql`Insert:

- 1 Global Director (email: admin@example.com)
- 1 Lead Curator (parent: Global Director)
- 1 Regional Curator (parent: Lead Curator)
- 1 City Curator (parent: Regional Curator)
- 2 Event Planners (parent: City Curator)
- Default approval config: all roles required
- 3 sample venues

Run migration and seed on Supabase project.---

## Phase 2: User Management (Week 2, Days 1-2)

**Goal:** Build complete user management system for Global Director to create, edit, deactivate users and view hierarchy.

### 2.1: User Management Backend - Data Access Layer

**File:** `/lib/data-access/users.dal.ts`Functions:

- `findAll()` - Fetch all users
- `findById(id)` - Fetch single user
- `findByRole(role)` - Fetch users by role
- `findChildren(parentId)` - Fetch direct children of a user
- `insert(user)` - Insert new user
- `update(id, updates)` - Update user
- `deactivate(id)` - Set is_active = false

### 2.2: User Management Backend - Service Layer

**Files:** `/lib/services/users/user.service.ts`, `/lib/services/users/hierarchy.service.ts`**user.service.ts:**

- `getAllUsers(requesterId)` - Check requester is Global Director, return all users
- `createUser(requesterId, data)` - Validate role, check permissions, insert user, send magic link, log audit
- `updateUser(requesterId, userId, data)` - Check permissions, update user, log audit
- `deactivateUser(requesterId, userId)` - Check permissions, soft delete, log audit
- `checkGlobalDirectorPassword(password)` - Extra confirmation for creating Global Director

**hierarchy.service.ts:**

- `getTree()` - Fetch all users and build tree structure
- `getSubordinates(userId)` - Use `get_subordinate_user_ids` function
- `validateParent(userId, parentId)` - Ensure no circular references

### 2.3: User Management Backend - Validation

**File:** `/lib/validation/users.schema.ts`Schemas:

- `createUserSchema` - email, name, role, parent_id, city, region
- `updateUserSchema` - partial of createUserSchema
- Export TypeScript types

### 2.4: User Management Backend - Server Actions

**File:** `/lib/actions/users.ts`Actions (all return `ActionResponse<T>`):

- `createUser(formData)` - Validate, call userService.createUser, revalidatePath
- `updateUser(userId, formData)` - Validate, call userService.updateUser, revalidatePath
- `deactivateUser(userId)` - Call userService.deactivateUser, revalidatePath
- `checkGlobalDirectorPassword(password)` - Call userService.checkGlobalDirectorPassword

### 2.5: User Management Backend - Route Handler

**File:** `/app/api/users/hierarchy/route.ts`

- GET endpoint returning hierarchy tree structure
- Used by hierarchy visualization component

### 2.6: User Management Frontend

**Files:** `/app/admin/users/page.tsx`, `/components/users/*`Components:

- **page.tsx** - Server Component, fetch users, display table, search bar, "Add User" button
- **UserTable.tsx** - Table with columns: name, email, role, parent, city, status, actions
- **UserFormDialog.tsx** - Dialog with form (react-hook-form + Zod), role selector, parent selector, city/region inputs, extra confirmation for Global Director
- **HierarchyTree.tsx** - Fetch from `/api/users/hierarchy`, display tree visualization
- **UserActions.tsx** - Dropdown menu with Edit, Deactivate options

Connect with TanStack Query for mutations, optimistic updates, toast notifications on success/error.---

## Phase 3: Profile & Settings (Week 2, Day 3, Morning)

**Goal:** Allow users to update their profile, upload avatar, set notification preferences.

### 3.1: Profile Backend - Data Access Layer

**File:** `/lib/data-access/storage.dal.ts`Functions:

- `uploadFile(bucket, path, file)` - Upload file to Supabase Storage
- `deleteFile(bucket, path)` - Delete file
- `getPublicUrl(bucket, path)` - Get public URL

### 3.2: Profile Backend - Service Layer

**File:** `/lib/services/storage/storage.service.ts`Functions:

- `uploadAvatar(userId, file)` - Upload to avatars bucket, return URL
- `deleteAvatar(userId, url)` - Delete old avatar file
- `uploadReportMedia(eventId, file)` - Upload to reports bucket (used later)

Create Supabase Storage buckets:

- `avatars` - Public read, authenticated write, 2MB limit, image/* only
- `reports` - Public read for approved, authenticated write, 50MB limit, image/*, video/*

### 3.3: Profile Backend - Server Actions

**File:** `/lib/actions/profile.ts`Actions:

- `updateProfile(formData)` - Update name, notification preferences
- `uploadAvatar(formData)` - Upload avatar, update user.avatar_url
- `getCurrentUserProfile()` - Fetch current user's full profile

### 3.4: Profile Frontend

**File:** `/app/profile/page.tsx`, `/components/profile/*`Components:

- **page.tsx** - Server Component, fetch profile
- **AvatarUpload.tsx** - Image upload with preview, call uploadAvatar action
- **ProfileForm.tsx** - Form with name, notification preferences (email on/off, frequency dropdown), phone (disabled for future), call updateProfile action
- Display read-only: role, city, parent name

---

## Phase 4: Permissions & Authorization (Week 2, Day 3)

**Goal:** Implement pyramid visibility checks and permission guards used throughout the app.

### 4.1: Permissions Backend

**Files:** `/lib/permissions/pyramid.ts`, `/lib/permissions/roles.ts`, `/lib/permissions/guards.ts`**pyramid.ts:**

- `canViewData(userId, targetUserId)` - Check if userId can view targetUserId's data (use `get_subordinate_user_ids`)
- `canViewEvent(userId, eventId)` - Check if userId can view event
- `canEditEvent(userId, eventId)` - Check if userId is event creator
- `canApproveEvent(userId, eventId)` - Check if userId is in approval chain
- `getVisibleUserIds(userId)` - Return array of user IDs visible to userId

**roles.ts:**

- `hasRole(userId, roles[])` - Check if user has one of the specified roles
- `isGlobalDirector(userId)` - Check if user is Global Director
- `getRoleLevel(role)` - Return numeric level (planner=1, global=5)

**guards.ts:**

- `requireCanViewEvent(userId, eventId)` - Throw error if can't view
- `requireCanEditEvent(userId, eventId)` - Throw error if can't edit
- `requireCanApprove(userId, eventId)` - Throw error if can't approve

---

## Phase 5: Venues Database (Week 2, Day 4)

**Goal:** Build venue management with duplicate prevention and pyramid visibility.

### 5.1: Venues Backend - Data Access Layer

**File:** `/lib/data-access/venues.dal.ts`Functions:

- `findAll()` - Fetch all venues (RLS applies pyramid visibility)
- `findById(id)` - Fetch single venue
- `findDuplicate(name, address, creatorId)` - Find venue with same name+address by creator
- `insert(venue)` - Insert venue
- `update(id, updates)` - Update venue
- `softDelete(id)` - Set is_active = false

### 5.2: Venues Backend - Service Layer

**File:** `/lib/services/venues/venue.service.ts`Functions:

- `getVenues(userId)` - Fetch venues visible to user
- `createVenue(userId, data)` - Check for duplicate, if exists update it, else insert new, log audit
- `updateVenue(userId, venueId, data)` - Check ownership, update, log audit
- `deleteVenue(userId, venueId)` - Check ownership, soft delete, log audit
- `banVenue(userId, venueId)` - Check is Global Director, soft delete, log audit

### 5.3: Venues Backend - Validation

**File:** `/lib/validation/venues.schema.ts`Schemas:

- `createVenueSchema` - name, address, city, capacity, notes
- `updateVenueSchema` - partial

### 5.4: Venues Backend - Server Actions

**File:** `/lib/actions/venues.ts`Actions:

- `getVenues()` - Fetch venues for current user
- `createVenue(formData)` - Validate, call venueService.createVenue
- `updateVenue(venueId, formData)` - Validate, call venueService.updateVenue
- `deleteVenue(venueId)` - Call venueService.deleteVenue
- `banVenue(venueId)` - Call venueService.banVenue (Global Director only)

### 5.5: Venues Frontend

**Files:** `/app/venues/page.tsx`, `/components/venues/*`Components:

- **page.tsx** - Server Component, fetch venues, display table, search bar, "Add Venue" button
- **VenueTable.tsx** - Table with: name, address, city, capacity, creator, actions
- **VenueFormDialog.tsx** - Form for create/edit, duplicate warning if similar venue found
- **VenueActions.tsx** - Dropdown: Edit, Delete, Ban (if Global Director)

---

## Phase 6: Event Creation & Drafts (Week 2, Day 5 + Week 3, Day 1)

**Goal:** Build event creation form with draft auto-save, template support, and submission for approval.

### 6.1: Events Backend - Data Access Layer

**Files:** `/lib/data-access/events.dal.ts`, `/lib/data-access/event-versions.dal.ts`, `/lib/data-access/event-approvals.dal.ts`, `/lib/data-access/templates.dal.ts`**events.dal.ts:**

- `findById(id)` - Fetch event
- `findByCreator(creatorId, status?)` - Fetch events by creator, optionally filter by status
- `findPyramidVisible(userId, filters)` - Fetch events visible to user (RLS + filters)
- `insert(event)` - Insert event
- `update(id, updates)` - Update event
- `delete(id)` - Hard delete (drafts only)

**event-versions.dal.ts:**

- `findByEventId(eventId)` - Fetch versions for event
- `findPendingVersion(eventId)` - Fetch pending modification version
- `insert(version)` - Insert version
- `update(id, updates)` - Update version
- `delete(id)` - Delete version

**event-approvals.dal.ts:**

- `findByEventId(eventId)` - Fetch approval chain for event
- `findPendingForUser(userId)` - Fetch approvals pending for user
- `insert(approval)` - Insert approval record
- `updateStatus(id, status, comment)` - Update approval status
- `createChain(eventId, approvers[], type)` - Insert multiple approval records

**templates.dal.ts:**

- `findByUserId(userId)` - Fetch user's templates
- `insert(template)` - Insert template
- `delete(id)` - Delete template

### 6.2: Events Backend - Service Layer

**Files:** `/lib/services/events/event.service.ts`, `/lib/services/events/draft.service.ts`, `/lib/services/approvals/approval.service.ts`, `/lib/services/approvals/chain-builder.service.ts`, `/lib/services/audit/audit.service.ts`**event.service.ts:**

- `getEventById(userId, eventId)` - Fetch event with permission check
- `getEventsForUser(userId, filters)` - Fetch pyramid-visible events with filters
- `submitForApproval(userId, eventId)` - Validate event, build approval chain, update status, create approval records, notify first approver, log audit
- `createFromRejected(userId, rejectedEventId)` - Copy rejected event to new draft

**draft.service.ts:**

- `createDraft(userId, data)` - Create draft event, log audit
- `updateDraft(userId, eventId, data)` - Update draft (auto-save), log audit
- `deleteDraft(userId, eventId)` - Check ownership, delete draft, log audit
- `getDrafts(userId)` - Fetch user's drafts
- `hasDraft(userId)` - Check if user has existing draft

**approval.service.ts:**

- `approveEvent(userId, eventId, comment)` - Mark approval as approved, if last in chain set event status to approved_scheduled, else notify next approver, log audit
- `rejectEvent(userId, eventId, comment)` - Mark approval as rejected, set event status to rejected, notify creator, log audit
- `getPendingApprovals(userId)` - Fetch events awaiting user's approval
- `notifyNextApprover(eventId)` - Send email to next approver in chain

**chain-builder.service.ts:**

- `buildChain(userId)` - Walk up hierarchy from userId to Global Director, filter by approval_configs, return array of approver IDs in order
- `getApprovalConfig()` - Fetch approval config (which roles are required)

**audit.service.ts:**

- `log(entry)` - Insert audit log entry
- `getEventAuditLog(eventId)` - Fetch audit log for event
- `filterLogs(filters)` - Filter audit logs

### 6.3: Events Backend - Validation

**File:** `/lib/validation/events.schema.ts`Schemas:

- `createEventSchema` - title, description, event_date, event_time, venue_id, expected_attendance, budget, notes
- `updateEventSchema` - partial
- `submitEventSchema` - eventId
- `approveEventSchema` - eventId, comment
- `rejectEventSchema` - eventId, comment

### 6.4: Events Backend - Server Actions

**File:** `/lib/actions/events.ts`Actions:

- `createEventDraft(formData)` - Validate, call draftService.createDraft
- `updateEventDraft(eventId, formData)` - Validate, call draftService.updateDraft
- `deleteDraft(eventId)` - Call draftService.deleteDraft
- `submitEventForApproval(eventId)` - Call eventService.submitForApproval
- `getEventById(eventId)` - Call eventService.getEventById
- `getDraftEvents()` - Call draftService.getDrafts
- `getEventsInReview()` - Call eventService.getEventsForUser with status filter
- `getRejectedEvents()` - Call eventService.getEventsForUser with status filter
- `createFromRejected(rejectedEventId)` - Call eventService.createFromRejected

### 6.5: Templates Backend - Server Actions

**File:** `/lib/actions/templates.ts`Actions:

- `getUserTemplates()` - Fetch user's templates
- `saveAsTemplate(eventId, name)` - Copy event data to template
- `loadFromTemplate(templateId)` - Return template data
- `deleteTemplate(templateId)` - Delete template

### 6.6: Events Frontend

**Files:** `/app/events/new/page.tsx`, `/app/events/requests/page.tsx`, `/components/events/*`Components:

- **`/app/events/new/page.tsx`** - Multi-step event creation form with auto-save
- Step 1: Title, description, event date, event time
- Step 2: Venue selection (dropdown or quick-add inline)
- Step 3: Expected attendance, budget, notes
- Step 4: Review and submit
- Auto-save draft every 30 seconds (debounced)
- "Save as Template" button
- "Load from Template" dropdown
- On mount: check for existing draft, prompt "Continue or start new?"
- **`/app/events/requests/page.tsx`** - Tabbed view
- Tabs: Drafts / In Review / Rejected
- Each tab shows filtered event list
- Actions: Edit (drafts), View (in review), Create new from (rejected)
- **`EventCard.tsx`** - Display event with title, date, venue, status badge
- **`EventFormSteps.tsx`** - Multi-step form component
- **`VenueSelect.tsx`** - Searchable dropdown with quick-add option
- **`TemplateSelector.tsx`** - Dropdown to load templates
- **`DraftDialog.tsx`** - Prompt to continue or delete existing draft

---

## Phase 7: Approval Dashboard (Week 3, Day 2)

**Goal:** Build approval dashboard for curators to approve/reject events.

### 7.1: Approvals Backend - Server Actions

**File:** `/lib/actions/approvals.ts`Actions:

- `getPendingEventApprovals()` - Call approvalService.getPendingApprovals for type='event'
- `approveEvent(eventId, comment)` - Validate comment required, call approvalService.approveEvent
- `rejectEvent(eventId, comment)` - Validate comment required, call approvalService.rejectEvent

### 7.2: Approvals Frontend

**Files:** `/app/approvals/page.tsx`, `/components/approvals/*`Components:

- **page.tsx** - Tabbed view (initially only Events tab, add more tabs in later phases)
- Tabs: Events / Modifications / Cancellations / Reports
- Initially: Events tab only
- **ApprovalList.tsx** - List of pending approvals with event details
- **ApprovalCard.tsx** - Card showing event info, approval chain progress, Approve/Reject buttons
- **ApprovalDialog.tsx** - Modal with event details, approval chain stepper, comment textarea (mandatory), Approve/Reject buttons
- **ApprovalChainProgress.tsx** - Stepper showing approval chain progress

---

## Phase 8: Current & Past Events Views (Week 3, Day 3)

**Goal:** Display approved events, past events, and archived events with advanced filters.

### 8.1: Event Lists Backend - Server Actions

**File:** `/lib/actions/events.ts` (add to existing)Actions:

- `getCurrentEvents(filters)` - Call eventService.getEventsForUser with status='approved_scheduled' + filters
- `getCompletedEvents()` - status='completed_awaiting_report'
- `getArchivedEvents()` - status='completed_archived'
- `getCancelledRejectedEvents()` - status IN ('cancelled', 'rejected')

### 8.2: Event Export Backend - Route Handler

**File:** `/app/api/export/events/route.ts`

- GET endpoint accepting query params (filters)
- Call eventService to fetch events
- Convert to CSV format
- Return as downloadable file

### 8.3: Auto Status Transition Backend

**File:** `/db/triggers/auto_status_transition.sql` OR Supabase Edge Function

- Database trigger or cron job running daily at midnight
- Update events where event_date < today AND status='approved_scheduled'
- Set status to 'completed_awaiting_report'
- Create audit log entries
- (Email notifications added in Phase 11)

### 8.4: Event Lists Frontend

**Files:** `/app/events/current/page.tsx`, `/app/events/past/page.tsx`, `/components/events/*`Components:

- **`/app/events/current/page.tsx`**
- Display approved_scheduled events
- Filter sidebar: city, region, date range, creator, venue, status
- View toggle: Cards / Table
- "Export CSV" button
- Event cards with status badges (modification pending, cancellation pending)
- **`/app/events/past/page.tsx`** - Tabbed view
- Tabs: Completed (awaiting report) / Archived / Cancelled-Rejected
- Same filters as current events
- **`EventFilters.tsx`** - Multi-select filters component
- **`EventTable.tsx`** - Table view of events
- **`EventExportButton.tsx`** - Trigger CSV export

---

## Phase 9: Modifications Workflow (Week 3, Day 4)

**Goal:** Allow event creators to request modifications, which go through approval chain.

### 9.1: Modifications Backend - Service Layer

**File:** `/lib/services/modifications/modification.service.ts`Functions:

- `requestModification(userId, eventId, changes)` - Check ownership, check no pending mod exists, create version record with status='pending', build approval chain, notify first approver, log audit
- `getPendingModifications(userId)` - Fetch modifications awaiting user's approval
- `approveModification(userId, versionId, comment)` - Mark approval as approved, if last in chain apply changes to event and archive old version, else notify next approver, log audit
- `rejectModification(userId, versionId, comment)` - Mark approval as rejected, delete pending version, notify creator, log audit
- `hasPendingModification(eventId)` - Check if event has pending modification

### 9.2: Modifications Backend - Validation

**File:** `/lib/validation/modifications.schema.ts`Schemas:

- `requestModificationSchema` - eventId, changes (same fields as event)
- `approveModificationSchema` - versionId, comment
- `rejectModificationSchema` - versionId, comment

### 9.3: Modifications Backend - Server Actions

**File:** `/lib/actions/modifications.ts`Actions:

- `requestModification(eventId, formData)` - Validate, call modificationService.requestModification
- `getPendingModifications()` - Call modificationService.getPendingModifications
- `approveModification(versionId, comment)` - Call modificationService.approveModification
- `rejectModification(versionId, comment)` - Call modificationService.rejectModification

### 9.4: Modifications Frontend

**Files:** `/components/events/*`, `/components/approvals/*`Components:

- **`RequestModificationButton.tsx`** - Button on event detail page (only for creator, only if approved_scheduled, only if no pending mod)
- **`ModificationForm.tsx`** - Pre-filled form with current event data, allow editing, show diff of changes
- **`ModificationDiff.tsx`** - Display what fields changed (old → new)
- **Approvals page** - Add Modifications tab showing pending modifications with diff view
- Update EventCard to show "Modification pending" badge

---

## Phase 10: Cancellations Workflow (Week 3, Day 5)

**Goal:** Allow authorized users to request cancellations, which go through approval chain.

### 10.1: Cancellations Backend - Service Layer

**File:** `/lib/services/cancellations/cancellation.service.ts`Functions:

- `canRequestCancellation(userId, eventId)` - Check permissions based on approval_configs (configurable by Global Director)
- `requestCancellation(userId, eventId, reason)` - Check permissions, create cancellation request, build approval chain, notify first approver, log audit
- `getPendingCancellations(userId)` - Fetch cancellations awaiting user's approval
- `approveCancellation(userId, eventId, comment)` - Mark approval as approved, if last in chain set event status to 'cancelled', else notify next approver, log audit
- `rejectCancellation(userId, eventId, comment)` - Mark approval as rejected, delete cancellation request, notify requester, log audit
- `hasPendingCancellation(eventId)` - Check if event has pending cancellation

### 10.2: Cancellations Backend - Validation

**File:** `/lib/validation/cancellations.schema.ts`Schemas:

- `requestCancellationSchema` - eventId, reason
- `approveCancellationSchema` - eventId, comment
- `rejectCancellationSchema` - eventId, comment

### 10.3: Cancellations Backend - Server Actions

**File:** `/lib/actions/cancellations.ts`Actions:

- `canRequestCancellation(eventId)` - Call cancellationService.canRequestCancellation
- `requestCancellation(eventId, reason)` - Validate, call cancellationService.requestCancellation
- `getPendingCancellations()` - Call cancellationService.getPendingCancellations
- `approveCancellation(eventId, comment)` - Call cancellationService.approveCancellation
- `rejectCancellation(eventId, comment)` - Call cancellationService.rejectCancellation

### 10.4: Cancellations Frontend

**Files:** `/components/events/*`, `/components/approvals/*`Components:

- **`RequestCancellationButton.tsx`** - Button on event detail page (check permissions, only if no pending cancellation)
- **`CancellationDialog.tsx`** - Warning message, reason textarea (mandatory), Confirm button
- **Approvals page** - Add Cancellations tab showing pending cancellations
- Update EventCard to show "Cancellation pending" badge

---

## Phase 11: Post-Event Reporting (Week 4, Days 1-2)

**Goal:** Allow event creators to submit reports with media after event completion, which go through approval chain.

### 11.1: Reports Backend - Service Layer

**File:** `/lib/services/reports/report.service.ts`Functions:

- `submitReport(userId, eventId, reportData, mediaFiles)` - Check event status is completed_awaiting_report, check creator, upload media files, create report data, build approval chain, notify first approver, log audit
- `updateReport(userId, reportId, reportData, mediaFiles)` - For resubmission after rejection
- `getReportByEventId(eventId)` - Fetch report for event
- `getPendingReports(userId)` - Fetch reports awaiting user's approval
- `approveReport(userId, reportId, comment)` - Mark approval as approved, if last in chain set event status to 'completed_archived', else notify next approver, log audit
- `rejectReport(userId, reportId, comment)` - Mark approval as rejected, set report status to 'rejected', notify creator with reason, log audit

### 11.2: Reports Backend - Data Access Layer

**File:** `/lib/data-access/reports.dal.ts`Functions:

- `findByEventId(eventId)` - Fetch report
- `insert(report)` - Insert report
- `update(id, updates)` - Update report

Add to schema (if not already there):

- **reports table:** id, event_id, attendance_count, summary, feedback, media_urls (jsonb), external_links (jsonb), status, created_at, updated_at

### 11.3: Reports Backend - Validation

**File:** `/lib/validation/reports.schema.ts`Schemas:

- `submitReportSchema` - eventId, attendance_count, summary, feedback, external_links[]
- `approveReportSchema` - reportId, comment
- `rejectReportSchema` - reportId, comment

### 11.4: Reports Backend - Server Actions

**File:** `/lib/actions/reports.ts`Actions:

- `submitReport(eventId, formData)` - Extract media files, validate, call reportService.submitReport
- `updateReport(reportId, formData)` - For resubmission, call reportService.updateReport
- `getReportByEventId(eventId)` - Call reportService.getReportByEventId
- `getPendingReports()` - Call reportService.getPendingReports
- `approveReport(reportId, comment)` - Call reportService.approveReport
- `rejectReport(reportId, comment)` - Call reportService.rejectReport

### 11.5: Reports Frontend

**Files:** `/components/events/*`, `/components/reports/*`, `/components/approvals/*`Components:

- **`ReportForm.tsx`** - Form with attendance count, summary textarea, feedback, media upload (drag-and-drop), external links, submit button
- Only visible on event detail when status='completed_awaiting_report' and user is creator
- **`MediaUploader.tsx`** - Multi-file drag-and-drop upload, progress bars, thumbnail previews, remove file button
- **`ReportViewer.tsx`** - Display report details, media gallery with lightbox, external links
- **Approvals page** - Add Reports tab showing pending reports
- **`ReportApprovalCard.tsx`** - Show report details, media, Approve/Reject buttons

---

## Phase 12: Audit Logs & Event History (Week 4, Day 3)

**Goal:** Display complete audit trail for each event with timeline visualization.

### 12.1: Audit Logs Backend - Data Access Layer

Already created in Phase 6 (`audit.service.ts`, `audit-logs.dal.ts`)Add if missing:

- `findByEventId(eventId)` - Fetch all logs for event
- `findByUser(userId)` - Fetch logs by user
- `filterLogs(criteria)` - Filter by action type, date range, user

### 12.2: Audit Logs Backend - Server Actions

**File:** `/lib/actions/audit.ts`Actions:

- `getEventAuditLog(eventId)` - Call auditService.getEventAuditLog
- `filterAuditLogs(filters)` - Call auditService.filterLogs

### 12.3: Version Comparison Backend

**File:** `/lib/services/events/version-compare.service.ts`Functions:

- `compareVersions(v1Id, v2Id)` - Fetch both versions, return structured diff object
- `getVersionHistory(eventId)` - Fetch all versions for event

Add server action:

- `compareEventVersions(v1Id, v2Id)` - Call version-compare service

### 12.4: Audit Logs Frontend

**Files:** `/components/audit/*`, `/components/events/*`Components:

- **`AuditTimeline.tsx`** - Vertical timeline visualization
- Each entry: timestamp, user avatar+name, action type, comment
- Color-coded badges: submitted (blue), approved (green), rejected (red), modified (yellow)
- Expandable to show metadata (JSON diff)
- **`AuditFilters.tsx`** - Filter by action type, date range, user
- **`VersionCompare.tsx`** - Side-by-side diff view, highlight changed fields
- Add to event detail page: "View History" accordion section showing AuditTimeline
- Add to modification approval dialog: "View Changes" button opening VersionCompare

---

## Phase 13: Dashboard & Calendar (Week 4, Days 4-5)

**Goal:** Create main dashboard with stats, calendar view, and activity feed.

### 13.1: Dashboard Backend - Service Layer

**File:** `/lib/services/dashboard/dashboard.service.ts`Functions:

- `getDashboardStats(userId)` - Return object with:
- pendingApprovals: count of approvals awaiting user
- upcomingEvents: count of events in next 30 days
- myDrafts: count of user's drafts
- recentActivity: last 10 audit log entries on visible events
- `getUpcomingEvents(userId, days)` - Fetch events in next X days
- `getActivityFeed(userId, limit)` - Fetch recent audit logs

### 13.2: Dashboard Backend - Server Actions

**File:** `/lib/actions/dashboard.ts`Actions:

- `getDashboardStats()` - Call dashboardService.getDashboardStats
- `getUpcomingEvents(days)` - Call dashboardService.getUpcomingEvents
- `getActivityFeed(limit)` - Call dashboardService.getActivityFeed

### 13.3: Calendar Backend - Server Actions

**File:** `/lib/actions/calendar.ts`Actions:

- `getEventsForCalendar(startDate, endDate)` - Fetch events in date range, return minimal data (id, title, event_date, status)

### 13.4: Dashboard Frontend

**Files:** `/app/dashboard/page.tsx`, `/components/dashboard/*`Components:

- **page.tsx** - Grid layout with stat cards + calendar + activity feed
- **`StatCard.tsx`** - Icon, label, count, clickable → navigate to relevant page
- "Pending Approvals" → /approvals
- "Upcoming Events" → /events/current
- "My Drafts" → /events/requests?tab=drafts
- **`EventCalendar.tsx`** - Monthly calendar view
- Use library: react-big-calendar or custom
- Color-coded by event status
- Click event → open detail modal
- Navigation: prev/next month, today button
- **`ActivityFeed.tsx`** - List of recent actions with user, action type, time ago

---

## Phase 14: Email Notifications (Week 5, Day 1)

**Goal:** Send email notifications for approval requests and results.

### 14.1: Email Backend - Service Layer

**File:** `/lib/services/email/email.service.ts`Functions:

- `sendMagicLink(email, token)` - Handled by Supabase Auth
- `sendApprovalNotification(userId, eventId, type)` - Send email to approver
- `sendApprovalResultNotification(userId, eventId, approved)` - Send email to creator
- `sendModificationNotification(userId, eventId)` - Send email to approver
- `sendCancellationNotification(userId, eventId)` - Send email to approver
- `sendReportNotification(userId, eventId)` - Send email to approver
- `sendReportResultNotification(userId, eventId, approved)` - Send email to creator

### 14.2: Email Templates Backend

**File:** `/lib/services/email/templates.service.ts`Functions:

- `renderApprovalRequest(event, approver)` - Return HTML email
- `renderApprovalResult(event, creator, approved, comment)` - Return HTML email
- `renderModificationRequest(event, changes, approver)` - Return HTML email
- `renderCancellationRequest(event, reason, approver)` - Return HTML email
- `renderReportRequest(event, report, approver)` - Return HTML email

Templates:

- Header with app logo/name
- Main content with event details
- CTA button with deep link to app
- Footer with unsubscribe link

### 14.3: Email Configuration

- Use Supabase built-in email or configure SMTP
- Create branded email templates in Supabase dashboard or as HTML files
- Add email sending to existing service functions:
- After submitForApproval → send email to first approver
- After approveEvent → send email to next approver or creator
- After rejectEvent → send email to creator
- Similar for modifications, cancellations, reports

### 14.4: Notification Preferences

Already implemented in Phase 3 (Profile settings)

- Before sending email, check user.notification_prefs
- Respect frequency (instant, daily, weekly)
- For daily/weekly: queue notifications (future enhancement)

---

## Phase 15: Error Handling & UI Polish (Week 5, Days 2-3)

**Goal:** Add consistent error handling, loading states, confirmation dialogs, and polish desktop UI.

### 15.1: Error Handling

**Files:** `/components/ui/ErrorBoundary.tsx`, `/lib/utils/errors.ts`

- Create React Error Boundary component wrapping app
- Display user-friendly error messages
- "Try again" button
- Install toast library: `sonner`
- Add toast notifications on all mutation success/error
- Ensure all server actions return standardized `ActionResponse<T>`

### 15.2: Loading States

**Files:** `/components/ui/skeletons/*`

- Create skeleton components:
- `TableSkeleton` - For data tables
- `CardSkeleton` - For card grids
- `FormSkeleton` - For forms
- `CalendarSkeleton` - For calendar
- Use React Suspense on pages for streaming
- Add loading spinners on buttons during mutations (use TanStack Query `isPending`)

### 15.3: Confirmation Dialogs

**Files:** `/components/ui/ConfirmDialog.tsx`

- Use shadcn/ui AlertDialog component
- Add confirmation dialogs for destructive actions:
- Delete draft
- Deactivate user
- Ban venue
- Request cancellation
- Reject approval (with mandatory comment)
- Consistent pattern: warning icon, descriptive text, Cancel/Confirm buttons

### 15.4: Desktop UI Polish

- Review all pages for visual consistency:
- Consistent spacing (Tailwind spacing scale)
- Consistent button styles (primary, secondary, destructive)
- Consistent form layouts (labels above inputs)
- Consistent table/card layouts
- Add hover states on interactive elements
- Ensure focus states are visible
- Test all workflows end-to-end on desktop
- Ensure shadcn/ui components are used consistently

---

## Phase 16: Final Testing & MVP Delivery (Week 5, Day 4-5)

**Goal:** Test all workflows, fix bugs, prepare for demo.

### 16.1: Functional Testing

Test complete workflows:

- **Event Lifecycle:** Create draft → Submit → Approve (multi-level) → Event scheduled → Modify → Approve modification → Event completed → Submit report → Approve report → Archived
- **Rejection Flow:** Create → Submit → Reject → Create new from rejected
- **Cancellation Flow:** Create → Approve → Request cancellation → Approve cancellation
- **Pyramid Visibility:** Test with users at different levels, verify each sees only appropriate data
- **Approval Chains:** Test with different approval configs, test skip logic

### 16.2: Edge Cases Testing

- Concurrent modifications to same event
- User deactivated mid-approval chain
- Event date passes while in approval
- Duplicate venue creation
- Orphaned users (parent deleted)
- Multiple drafts management

### 16.3: UI/UX Testing

- Test all forms with validation errors
- Test all buttons and links
- Test all modals and dialogs
- Test navigation flow
- Test desktop browsers (Chrome, Firefox, Safari)

### 16.4: Bug Fixes & Refinements

- Fix any bugs found during testing
- Refine error messages
- Improve loading states
- Polish animations/transitions

### 16.5: Demo Preparation

- Seed demo data (realistic events, users, approvals)
- Prepare demo script showcasing key features
- Test demo flow
- Document any known issues for post-MVP

---

# END OF 5-WEEK MVP

**Deliverable:** Fully functional event management platform with all features working on desktop. Ready for demonstration and initial user testing.---

# POST-MVP PHASES (After Week 5)

## Phase 17: Accessibility Audit & Compliance

### 17.1: ARIA Labels & Semantic HTML

- Audit all interactive elements for ARIA labels
- Ensure proper heading hierarchy
- Add aria-label to icon-only buttons
- Add aria-describedby for form errors
- Use semantic HTML tags

### 17.2: Keyboard Navigation

- Test with keyboard only (Tab, Enter, Escape)
- Ensure focus trap in modals
- Test dropdown/combobox keyboard navigation
- Add visible focus indicators
- Add skip to main content link

### 17.3: Screen Reader Testing

- Test with VoiceOver or NVDA
- Ensure form fields announced properly
- Ensure status messages announced (live regions)
- Fix any issues found

### 17.4: Color Contrast

- Use contrast checker tool
- Ensure WCAG AA compliance (4.5:1 for normal text)
- Don't rely solely on color for information

---

## Phase 18: Responsive Design Refinement

### 18.1: Mobile Layout (320px-768px)

- Convert sidebars to hamburger menus
- Stack form fields vertically
- Switch tables to card views
- Make touch targets 44x44px minimum
- Test bottom navigation vs top nav
- Ensure modals scrollable on small screens

### 18.2: Tablet Layout (768px-1024px)

- Adjust grid layouts (2-column vs 3-column)
- Maintain some sidebar visibility
- Optimize calendar for tablet
- Test landscape and portrait

### 18.3: Touch Interactions

- Add swipe gestures where appropriate
- Test all buttons/links are tappable
- Ensure dropdowns work with touch

---

## Phase 19: Performance Optimization

### 19.1: Database Optimization

- Run EXPLAIN ANALYZE on slow queries
- Add indexes:
- users(parent_id)
- events(status, event_date)
- events(creator_id)
- event_approvals(approver_id, status)
- audit_logs(event_id, created_at)
- venues(creator_id)
- Consider materialized view for user hierarchy

### 19.2: Frontend Optimization

- Configure TanStack Query cache (staleTime)
- Use query prefetching on hover
- Optimize images (Next.js Image component)
- Generate thumbnails for uploaded media
- Code splitting (lazy load heavy components)
- Implement pagination (20-50 items per page)

### 19.3: Load Testing

- Test with large datasets (1000+ users, 10,000+ events)
- Test concurrent users
- Monitor with Lighthouse
- Optimize bottlenecks

---

## Phase 20: Security Hardening & Comprehensive Testing

### 20.1: Security Audit

- Review server actions for authorization
- Add rate limiting
- Test for SQL injection
- Test for XSS
- Review file upload security

### 20.2: Penetration Testing

---

# CURRENT SPRINT TODO LIST

> **Note:** Template features are excluded from MVP. Google Maps integration pending API key.

> **Testing Strategy:** For each feature, write unit tests, integration tests, and manual test scripts.

## ✅ Completed (Sprint 1)

- [x] S1.1: Design Research & Wireframing (DEV-5)
- [x] S1.2: Design System Definition (DEV-6)
- [x] S1.3: Project Configuration Files (DEV-7)
- [x] S1.4: Next.js Initialization (DEV-8)
- [x] S1.5: Database Schema Creation (DEV-9)
- [x] S1.6: PostgreSQL Functions & Triggers (DEV-10)
- [x] S1.7: RLS Policies (DEV-11) - Note: Using backend authorization instead
- [x] S1.8: Supabase Clients & Auth Utilities (DEV-12)
- [x] S1.9: Authentication UI (DEV-13)
- [x] S1.10: Seed Data (DEV-14)

## 🔄 In Progress

### Testing Infrastructure Setup

- [ ] Install Vitest + @testing-library/react
- [ ] Install @testing-library/jest-dom
- [ ] Install @testing-library/user-event
- [ ] Create vitest.config.ts
- [ ] Create test setup file
- [ ] Add test scripts to package.json
- [ ] Create test utilities and helpers

### User Management Backend (DEV-15) - S1.11

**Status:** In Progress (DEV-35)

**Files:**

- `/lib/data-access/users.dal.ts`
- `/lib/services/users/user.service.ts`
- `/lib/validation/users.schema.ts`
- `/lib/actions/users.ts`
- `/app/api/users/hierarchy/route.ts`

**Tasks:**

- [ ] Create `users.dal.ts` with CRUD operations
  - [ ] findAll(subordinateUserIds)
  - [ ] findById(id, subordinateUserIds)
  - [ ] findByRole(role)
  - [ ] findChildren(parentId)
  - [ ] insert(user)
  - [ ] update(id, updates)
  - [ ] deactivate(id)
- [ ] Create `user.service.ts` with business logic
  - [ ] getAllUsers(requesterId) - Global Director only
  - [ ] createUser(requesterId, data) - validate role, check permissions
  - [ ] updateUser(requesterId, userId, data) - check permissions
  - [ ] deactivateUser(requesterId, userId) - check permissions
  - [ ] checkGlobalDirectorPassword(password) - extra confirmation
  - [ ] Integration with hierarchy.service for validation
- [ ] Create `users.schema.ts` with Zod validation
  - [ ] createUserSchema (email, name, role, parent_id, city, region)
  - [ ] updateUserSchema (partial of createUserSchema)
  - [ ] Export TypeScript types
- [ ] Create `users.ts` server actions
  - [ ] createUser(formData) - validate, call service, revalidatePath
  - [ ] updateUser(userId, formData) - validate, call service
  - [ ] deactivateUser(userId) - call service
  - [ ] getUsers() - fetch users for current user
  - [ ] checkGlobalDirectorPassword(password) - for confirmation
- [ ] Create `/app/api/users/hierarchy/route.ts`
  - [ ] GET endpoint returning hierarchy tree
  - [ ] Used by hierarchy visualization component
- [ ] Write unit tests for users.dal.ts
- [ ] Write unit tests for user.service.ts
- [ ] Write integration tests for users.ts actions
- [ ] Write API tests for hierarchy route
- [ ] Manual testing: Create, update, deactivate users

## 📋 Sprint 1 Remaining (Week 2-3)

### User Management Frontend (DEV-16) - S1.12

**Priority:** HIGH

**Files:**

- `/app/(dashboard)/layout.tsx`
- `/app/(dashboard)/users/page.tsx`
- `/components/users/UserTable.tsx`
- `/components/users/UserFormDialog.tsx`
- `/components/users/HierarchyTree.tsx`
- `/components/users/UserActions.tsx`

**Tasks:**

- [ ] Update dashboard layout with navigation
- [ ] Create users page (Server Component)
  - [ ] Fetch users
  - [ ] Display table
  - [ ] Search bar
  - [ ] "Add User" button
- [ ] Build UserTable component
  - [ ] Columns: name, email, role, parent, city, status, actions
  - [ ] Sorting
  - [ ] Filtering
- [ ] Build UserFormDialog component
  - [ ] Form with react-hook-form + Zod
  - [ ] Role selector
  - [ ] Parent selector (filtered by role hierarchy)
  - [ ] City/region inputs
  - [ ] Extra confirmation for Global Director
  - [ ] Create/Edit modes
- [ ] Build HierarchyTree component
  - [ ] Fetch from /api/users/hierarchy
  - [ ] Display tree visualization
  - [ ] Expand/collapse nodes
- [ ] Build UserActions component
  - [ ] Dropdown menu: Edit, Deactivate
  - [ ] Permission checks
- [ ] Install shadcn/ui components needed
  - [ ] table, dialog, form, select, dropdown-menu
- [ ] Connect TanStack Query for mutations
- [ ] Add optimistic updates
- [ ] Add toast notifications
- [ ] Write component tests
- [ ] Manual testing: Full user management workflow

### Profile & Permissions (DEV-17) - S1.13

**Priority:** HIGH

**Files:**

- `/lib/data-access/storage.dal.ts`
- `/lib/services/storage/storage.service.ts`
- `/lib/actions/profile.ts`
- `/lib/permissions/pyramid.ts`
- `/lib/permissions/roles.ts`
- `/lib/permissions/guards.ts`
- `/app/(dashboard)/profile/page.tsx`
- `/components/profile/AvatarUpload.tsx`
- `/components/profile/ProfileForm.tsx`

**Tasks:**

- [ ] Create Supabase Storage buckets
  - [ ] avatars (public read, auth write, 2MB, image/*)
  - [ ] reports (conditional read, auth write, 50MB, image/*, video/*)
- [ ] Create `storage.dal.ts`
  - [ ] uploadFile(bucket, path, file)
  - [ ] deleteFile(bucket, path)
  - [ ] getPublicUrl(bucket, path)
- [ ] Create `storage.service.ts`
  - [ ] uploadAvatar(userId, file) - upload & return URL
  - [ ] deleteAvatar(userId, url) - delete old avatar
  - [ ] uploadReportMedia(eventId, file) - for later phase
- [ ] Create `profile.ts` actions
  - [ ] updateProfile(formData) - update name, notification prefs
  - [ ] uploadAvatar(formData) - upload and update user.avatar_url
  - [ ] getCurrentUserProfile() - fetch current user
- [ ] Create `pyramid.ts` permission helpers
  - [ ] canViewData(userId, targetUserId) - pyramid visibility check
  - [ ] canViewEvent(userId, eventId)
  - [ ] canEditEvent(userId, eventId)
  - [ ] canApproveEvent(userId, eventId)
  - [ ] getVisibleUserIds(userId) - return array of visible user IDs
- [ ] Create `roles.ts` helpers
  - [ ] hasRole(userId, roles[])
  - [ ] isGlobalDirector(userId)
  - [ ] getRoleLevel(role) - return numeric level
- [ ] Create `guards.ts` with error-throwing guards
  - [ ] requireCanViewEvent(userId, eventId)
  - [ ] requireCanEditEvent(userId, eventId)
  - [ ] requireCanApprove(userId, eventId)
- [ ] Build profile page
  - [ ] Server Component fetch profile
  - [ ] Display sections
- [ ] Build AvatarUpload component
  - [ ] Image upload with preview
  - [ ] Call uploadAvatar action
  - [ ] Show loading state
- [ ] Build ProfileForm component
  - [ ] Form: name, notification preferences
  - [ ] Email on/off, frequency dropdown
  - [ ] Display read-only: role, city, parent name
- [ ] Write tests for permission helpers
- [ ] Write tests for profile actions
- [ ] Write component tests
- [ ] Manual testing: Profile update, avatar upload

## 📋 Sprint 2 Tasks (Weeks 3-4)

### Venue Schema Update & Migration

**Priority:** HIGH (Blocks Venues Management)

**Files:**

- `/db/migrations/002_update_venues_schema.sql`

**Tasks:**

- [ ] Create migration file
  - [ ] Add `country` VARCHAR(100)
  - [ ] Add `region` VARCHAR(100) (Note: may conflict with existing field)
  - [ ] Add `city` VARCHAR(100) (Note: may conflict with existing field)
  - [ ] Add `location` JSONB with structure: {lat: number, lng: number}
  - [ ] Add index on location (GiST index for spatial queries if needed)
  - [ ] Update findDuplicate logic to use new fields
- [ ] Apply migration to Supabase
- [ ] Update database.types.ts
- [ ] Test migration rollback

### Venues Management (DEV-18) - S2.1

**Priority:** HIGH

**Dependencies:** Venue schema update

**Files:**

- Update existing `/lib/data-access/venues.dal.ts`
- Update existing `/lib/services/venues/venue.service.ts`
- Update existing `/lib/validation/venues.schema.ts`
- Update existing `/lib/actions/venues.ts`
- `/app/(dashboard)/venues/page.tsx`
- Existing `/components/venues/*`

**Tasks:**

- [ ] Update `venues.dal.ts` for new schema
  - [ ] Update findDuplicate to check country, region, city
  - [ ] Update search to include new fields
  - [ ] Add type definitions for location field
- [ ] Update `venues.schema.ts`
  - [ ] Add country, region, city fields (required)
  - [ ] Add location field (lat/lng) (required)
  - [ ] Validation: lat between -90 and 90, lng between -180 and 180
- [ ] Update `venue.service.ts`
  - [ ] Update createVenue to handle new fields
  - [ ] Update duplicate detection logic
  - [ ] Add audit logging
- [ ] Update `venues.ts` actions
  - [ ] Update all actions to pass new fields
- [ ] **DEFERRED:** Google Maps integration (waiting for API key)
  - [ ] Add location picker component
  - [ ] Autocomplete for address
  - [ ] Show map preview
- [ ] Create venues page
  - [ ] Server Component fetch venues
  - [ ] Display VenueTable
  - [ ] Search bar
  - [ ] "Add Venue" button
- [ ] Update VenueFormDialog
  - [ ] Add country field
  - [ ] Add region/city fields (or use existing)
  - [ ] Add location picker (manual entry for now)
  - [ ] Duplicate warning if similar venue found
- [ ] Update VenueActions
  - [ ] Edit, Delete, Ban (Global Director only)
- [ ] Write tests for updated DAL
- [ ] Write tests for updated service
- [ ] Write tests for actions
- [ ] Write component tests
- [ ] Manual testing: Full venue CRUD workflow

### Events Backend - DAL & Services (DEV-19) - S2.2

**Priority:** HIGH

**Files:**

- `/lib/data-access/events.dal.ts`
- `/lib/data-access/event-versions.dal.ts`
- `/lib/data-access/event-approvals.dal.ts`
- `/lib/data-access/audit-logs.dal.ts`
- `/lib/services/events/event.service.ts`
- `/lib/services/events/draft.service.ts`
- `/lib/services/audit/audit.service.ts`

**Tasks:**

- [ ] Create `events.dal.ts`
  - [ ] findById(id, subordinateUserIds)
  - [ ] findByCreator(creatorId, status?)
  - [ ] findPyramidVisible(userId, filters) - filtered events
  - [ ] insert(event)
  - [ ] update(id, updates)
  - [ ] delete(id) - hard delete for drafts only
- [ ] Create `event-versions.dal.ts`
  - [ ] findByEventId(eventId)
  - [ ] findPendingVersion(eventId)
  - [ ] insert(version)
  - [ ] update(id, updates)
  - [ ] delete(id)
- [ ] Create `event-approvals.dal.ts`
  - [ ] findByEventId(eventId)
  - [ ] findPendingForUser(userId)
  - [ ] insert(approval)
  - [ ] updateStatus(id, status, comment)
  - [ ] createChain(eventId, approvers[], type)
- [ ] Create `audit-logs.dal.ts`
  - [ ] findByEventId(eventId)
  - [ ] findByUser(userId)
  - [ ] filterLogs(criteria)
  - [ ] insert(logEntry)
- [ ] Create `event.service.ts`
  - [ ] getEventById(userId, eventId) - with permission check
  - [ ] getEventsForUser(userId, filters) - pyramid visible
  - [ ] submitForApproval(userId, eventId) - validate, build chain, notify
  - [ ] createFromRejected(userId, rejectedEventId) - copy to new draft
- [ ] Create `draft.service.ts`
  - [ ] createDraft(userId, data) - create draft event
  - [ ] updateDraft(userId, eventId, data) - auto-save
  - [ ] deleteDraft(userId, eventId) - check ownership
  - [ ] getDrafts(userId) - fetch user's drafts
  - [ ] hasDraft(userId) - check if user has existing draft
- [ ] Create `audit.service.ts`
  - [ ] log(entry) - insert audit log
  - [ ] getEventAuditLog(eventId)
  - [ ] filterLogs(filters)
- [ ] Write unit tests for all DALs
- [ ] Write unit tests for all services
- [ ] Manual testing with seed data

### Approval Chain Builder (DEV-20) - S2.3

**Priority:** HIGH

**Files:**

- Update existing `/lib/services/approvals/chain-builder.service.ts`
- `/lib/services/approvals/approval.service.ts`
- `/lib/data-access/approval-configs.dal.ts`

**Tasks:**

- [ ] Create `approval-configs.dal.ts`
  - [ ] get() - fetch current config
  - [ ] update(config) - update config
- [ ] Update `chain-builder.service.ts`
  - [ ] buildChain(userId) - walk up hierarchy
  - [ ] Filter by approval_configs (which roles required)
  - [ ] Return array of approver IDs in order
  - [ ] getApprovalConfig() - fetch config
- [ ] Create `approval.service.ts`
  - [ ] approveEvent(userId, eventId, comment)
    - [ ] Mark approval as approved
    - [ ] If last in chain: set event status to approved_scheduled
    - [ ] Else: notify next approver
    - [ ] Log audit
  - [ ] rejectEvent(userId, eventId, comment)
    - [ ] Mark approval as rejected
    - [ ] Set event status to rejected
    - [ ] Notify creator
    - [ ] Log audit
  - [ ] getPendingApprovals(userId) - fetch events awaiting approval
  - [ ] notifyNextApprover(eventId) - send email (stub for now)
- [ ] Write tests for chain builder logic
- [ ] Write tests for approval service
- [ ] Test various hierarchy configurations

### Events Actions & Validation (DEV-21) - S2.4

**Priority:** HIGH

**Files:**

- `/lib/validation/events.schema.ts`
- `/lib/actions/events.ts`

**Tasks:**

- [ ] Create `events.schema.ts`
  - [ ] createEventSchema - title, description, event_date, event_time, venue_id, expected_attendance, budget, notes
  - [ ] updateEventSchema - partial
  - [ ] submitEventSchema - eventId
  - [ ] approveEventSchema - eventId, comment
  - [ ] rejectEventSchema - eventId, comment
  - [ ] Export TypeScript types
- [ ] Create `events.ts` actions (excluding templates)
  - [ ] createEventDraft(formData)
  - [ ] updateEventDraft(eventId, formData)
  - [ ] deleteDraft(eventId)
  - [ ] submitEventForApproval(eventId)
  - [ ] getEventById(eventId)
  - [ ] getDraftEvents()
  - [ ] getEventsInReview()
  - [ ] getRejectedEvents()
  - [ ] createFromRejected(rejectedEventId)
- [ ] Write validation tests
- [ ] Write action tests
- [ ] Integration tests

### Event Creation UI (DEV-22) - S2.5

**Priority:** HIGH

**Files:**

- `/app/(dashboard)/events/new/page.tsx`
- `/components/events/EventFormSteps.tsx`
- `/components/events/DraftDialog.tsx`
- `/components/venues/VenueSelect.tsx`

**Tasks:**

- [ ] Create event creation page
  - [ ] Multi-step form (4 steps)
  - [ ] Step 1: Title, description, event date, event time
  - [ ] Step 2: Venue selection (dropdown)
  - [ ] Step 3: Expected attendance, budget, notes
  - [ ] Step 4: Review and submit
  - [ ] Auto-save draft every 30 seconds (debounced)
  - [ ] On mount: check for existing draft, prompt user
- [ ] Build EventFormSteps component
  - [ ] Step indicators
  - [ ] Navigation: Next, Back, Submit buttons
  - [ ] Form validation per step
  - [ ] Progress indicator
- [ ] Build DraftDialog component
  - [ ] "Continue draft" or "Start new" options
  - [ ] Show draft preview
- [ ] Build VenueSelect component
  - [ ] Searchable dropdown
  - [ ] Quick-add inline option (optional)
  - [ ] Display venue details
- [ ] Install shadcn/ui components: steps, multi-step form
- [ ] Connect with TanStack Query
- [ ] Add toast notifications
- [ ] Write component tests
- [ ] Manual testing: Full event creation flow

### Event Requests UI (DEV-23) - S2.6

**Priority:** HIGH

**Files:**

- `/app/(dashboard)/events/requests/page.tsx`
- `/components/events/EventCard.tsx`
- `/components/events/EventList.tsx`
- `/components/events/EventActions.tsx`

**Tasks:**

- [ ] Create event requests page
  - [ ] Tabbed view: Drafts / In Review / Rejected
  - [ ] Server Component fetch events
- [ ] Build EventCard component
  - [ ] Display: title, date, venue, status badge
  - [ ] Click to view details
  - [ ] Actions menu
- [ ] Build EventList component
  - [ ] Grid or list view toggle
  - [ ] Filter options
  - [ ] Pagination
- [ ] Build EventActions component
  - [ ] For drafts: Edit, Delete, Submit
  - [ ] For in review: View only
  - [ ] For rejected: View, Create new from
- [ ] Install shadcn/ui: tabs, card
- [ ] Write component tests
- [ ] Manual testing: Navigate through tabs

### Approval Dashboard Backend (DEV-24) - S2.7

**Priority:** HIGH

**Files:**

- `/lib/actions/approvals.ts`

**Tasks:**

- [ ] Create `approvals.ts` actions
  - [ ] getPendingEventApprovals() - fetch events pending approval
  - [ ] approveEvent(eventId, comment) - validate comment, call service
  - [ ] rejectEvent(eventId, comment) - validate comment, call service
  - [ ] All return ActionResponse
  - [ ] Revalidate /approvals path after mutations
- [ ] Write action tests
- [ ] Integration tests

### Approval Dashboard UI (DEV-25) - S2.8

**Priority:** HIGH

**Files:**

- `/app/(dashboard)/approvals/page.tsx`
- `/components/approvals/ApprovalList.tsx`
- `/components/approvals/ApprovalCard.tsx`
- `/components/approvals/ApprovalDialog.tsx`
- `/components/approvals/ApprovalChainProgress.tsx`

**Tasks:**

- [ ] Create approvals page
  - [ ] Tabbed view (Events / Modifications / Cancellations / Reports)
  - [ ] Initially: Events tab only
  - [ ] Server Component fetch pending approvals
- [ ] Build ApprovalList component
  - [ ] List of pending approvals
  - [ ] Filter/sort options
- [ ] Build ApprovalCard component
  - [ ] Show event info
  - [ ] Show approval chain progress
  - [ ] Approve/Reject buttons
- [ ] Build ApprovalDialog component
  - [ ] Modal with full event details
  - [ ] Approval chain stepper
  - [ ] Comment textarea (mandatory)
  - [ ] Approve/Reject buttons
- [ ] Build ApprovalChainProgress component
  - [ ] Stepper showing approval chain
  - [ ] Completed/pending/current indicators
- [ ] Write component tests
- [ ] Manual testing: Approve/reject workflow

### Current & Past Events Views (DEV-26) - S2.9

**Priority:** MEDIUM

**Files:**

- Update `/lib/actions/events.ts`
- `/app/api/export/events/route.ts`
- `/app/(dashboard)/events/current/page.tsx`
- `/app/(dashboard)/events/past/page.tsx`
- `/components/events/EventFilters.tsx`
- `/components/events/EventTable.tsx`
- `/components/events/EventExportButton.tsx`

**Tasks:**

- [ ] Add actions to `events.ts`
  - [ ] getCurrentEvents(filters) - status='approved_scheduled'
  - [ ] getCompletedEvents() - status='completed_awaiting_report'
  - [ ] getArchivedEvents() - status='completed_archived'
  - [ ] getCancelledRejectedEvents() - status IN ('cancelled', 'rejected')
- [ ] Create export API route
  - [ ] GET endpoint with query params
  - [ ] Fetch events
  - [ ] Convert to CSV
  - [ ] Return downloadable file
- [ ] Create current events page
  - [ ] Display approved_scheduled events
  - [ ] Filter sidebar
  - [ ] View toggle: Cards / Table
  - [ ] Export CSV button
- [ ] Create past events page
  - [ ] Tabs: Completed / Archived / Cancelled-Rejected
  - [ ] Same filters as current
- [ ] Build EventFilters component
  - [ ] Multi-select: city, region, date range, creator, venue, status
- [ ] Build EventTable component
  - [ ] Table view with sorting
  - [ ] Columns: title, date, venue, creator, status, actions
- [ ] Build EventExportButton component
  - [ ] Trigger CSV export
  - [ ] Show loading state
- [ ] Auto status transition trigger/cron
  - [ ] Database trigger OR Supabase Edge Function
  - [ ] Update events where event_date < today AND status='approved_scheduled'
  - [ ] Set status to 'completed_awaiting_report'
  - [ ] Create audit log entries
- [ ] Write tests
- [ ] Manual testing: View events, export CSV

## 📋 Sprint 3 Tasks (Weeks 4-5)

### Modifications Workflow (DEV-27) - S3.1

**Priority:** HIGH

**Files:**

- `/lib/services/modifications/modification.service.ts`
- `/lib/validation/modifications.schema.ts`
- `/lib/actions/modifications.ts`
- `/components/events/RequestModificationButton.tsx`
- `/components/events/ModificationForm.tsx`
- `/components/events/ModificationDiff.tsx`

**Tasks:**

- [ ] Create `modification.service.ts`
  - [ ] requestModification(userId, eventId, changes)
  - [ ] getPendingModifications(userId)
  - [ ] approveModification(userId, versionId, comment)
  - [ ] rejectModification(userId, versionId, comment)
  - [ ] hasPendingModification(eventId)
- [ ] Create `modifications.schema.ts`
  - [ ] requestModificationSchema
  - [ ] approveModificationSchema
  - [ ] rejectModificationSchema
- [ ] Create `modifications.ts` actions
  - [ ] requestModification(eventId, formData)
  - [ ] getPendingModifications()
  - [ ] approveModification(versionId, comment)
  - [ ] rejectModification(versionId, comment)
- [ ] Build RequestModificationButton
  - [ ] Show only for creator, approved_scheduled events, no pending mod
- [ ] Build ModificationForm
  - [ ] Pre-filled with current data
  - [ ] Show diff of changes
- [ ] Build ModificationDiff
  - [ ] Display old → new for changed fields
- [ ] Update Approvals page - add Modifications tab
- [ ] Update EventCard to show "Modification pending" badge
- [ ] Write tests
- [ ] Manual testing: Request, approve, reject modifications

### Cancellations Workflow (DEV-28) - S3.2

**Priority:** HIGH

**Files:**

- `/lib/services/cancellations/cancellation.service.ts`
- `/lib/validation/cancellations.schema.ts`
- `/lib/actions/cancellations.ts`
- `/components/events/RequestCancellationButton.tsx`
- `/components/events/CancellationDialog.tsx`

**Tasks:**

- [ ] Create `cancellation.service.ts`
  - [ ] canRequestCancellation(userId, eventId)
  - [ ] requestCancellation(userId, eventId, reason)
  - [ ] getPendingCancellations(userId)
  - [ ] approveCancellation(userId, eventId, comment)
  - [ ] rejectCancellation(userId, eventId, comment)
  - [ ] hasPendingCancellation(eventId)
- [ ] Create `cancellations.schema.ts`
  - [ ] requestCancellationSchema
  - [ ] approveCancellationSchema
  - [ ] rejectCancellationSchema
- [ ] Create `cancellations.ts` actions
  - [ ] canRequestCancellation(eventId)
  - [ ] requestCancellation(eventId, reason)
  - [ ] getPendingCancellations()
  - [ ] approveCancellation(eventId, comment)
  - [ ] rejectCancellation(eventId, comment)
- [ ] Build RequestCancellationButton
  - [ ] Check permissions
  - [ ] Show only if no pending cancellation
- [ ] Build CancellationDialog
  - [ ] Warning message
  - [ ] Reason textarea (mandatory)
  - [ ] Confirm button
- [ ] Update Approvals page - add Cancellations tab
- [ ] Update EventCard to show "Cancellation pending" badge
- [ ] Write tests
- [ ] Manual testing: Request, approve, reject cancellations

### Post-Event Reporting (DEV-29) - S3.3

**Priority:** HIGH

**Files:**

- `/lib/data-access/reports.dal.ts`
- `/lib/services/reports/report.service.ts`
- `/lib/validation/reports.schema.ts`
- `/lib/actions/reports.ts`
- `/components/reports/ReportForm.tsx`
- `/components/reports/MediaUploader.tsx`
- `/components/reports/ReportViewer.tsx`
- `/components/reports/ReportApprovalCard.tsx`

**Tasks:**

- [ ] Add reports table to schema (if not exists)
  - [ ] id, event_id, attendance_count, summary, feedback
  - [ ] media_urls (jsonb), external_links (jsonb)
  - [ ] status, created_at, updated_at
- [ ] Create `reports.dal.ts`
  - [ ] findByEventId(eventId)
  - [ ] insert(report)
  - [ ] update(id, updates)
- [ ] Create `report.service.ts`
  - [ ] submitReport(userId, eventId, reportData, mediaFiles)
  - [ ] updateReport(userId, reportId, reportData, mediaFiles)
  - [ ] getReportByEventId(eventId)
  - [ ] getPendingReports(userId)
  - [ ] approveReport(userId, reportId, comment)
  - [ ] rejectReport(userId, reportId, comment)
- [ ] Create `reports.schema.ts`
  - [ ] submitReportSchema
  - [ ] approveReportSchema
  - [ ] rejectReportSchema
- [ ] Create `reports.ts` actions
  - [ ] submitReport(eventId, formData)
  - [ ] updateReport(reportId, formData)
  - [ ] getReportByEventId(eventId)
  - [ ] getPendingReports()
  - [ ] approveReport(reportId, comment)
  - [ ] rejectReport(reportId, comment)
- [ ] Build ReportForm
  - [ ] Attendance count
  - [ ] Summary textarea
  - [ ] Feedback
  - [ ] Media upload (drag-and-drop)
  - [ ] External links
  - [ ] Submit button
- [ ] Build MediaUploader
  - [ ] Multi-file drag-and-drop
  - [ ] Progress bars
  - [ ] Thumbnail previews
  - [ ] Remove file button
- [ ] Build ReportViewer
  - [ ] Display report details
  - [ ] Media gallery with lightbox
  - [ ] External links
- [ ] Build ReportApprovalCard
  - [ ] Show report details
  - [ ] Show media
  - [ ] Approve/Reject buttons
- [ ] Update Approvals page - add Reports tab
- [ ] Show ReportForm on event detail when status='completed_awaiting_report' and user is creator
- [ ] Write tests
- [ ] Manual testing: Submit, approve, reject reports

### Audit Logs & Event History (DEV-30) - S3.4

**Priority:** MEDIUM

**Files:**

- `/lib/actions/audit.ts`
- `/lib/services/events/version-compare.service.ts`
- `/components/audit/AuditTimeline.tsx`
- `/components/audit/AuditFilters.tsx`
- `/components/audit/VersionCompare.tsx`

**Tasks:**

- [ ] Create `audit.ts` actions
  - [ ] getEventAuditLog(eventId)
  - [ ] filterAuditLogs(filters)
- [ ] Create `version-compare.service.ts`
  - [ ] compareVersions(v1Id, v2Id) - return structured diff
  - [ ] getVersionHistory(eventId) - fetch all versions
- [ ] Add action: compareEventVersions(v1Id, v2Id)
- [ ] Build AuditTimeline component
  - [ ] Vertical timeline visualization
  - [ ] Each entry: timestamp, user avatar+name, action type, comment
  - [ ] Color-coded badges
  - [ ] Expandable metadata (JSON diff)
- [ ] Build AuditFilters component
  - [ ] Filter: action type, date range, user
- [ ] Build VersionCompare component
  - [ ] Side-by-side diff view
  - [ ] Highlight changed fields
- [ ] Add to event detail page: "View History" accordion
- [ ] Add to modification approval dialog: "View Changes" button
- [ ] Write tests
- [ ] Manual testing: View history, compare versions

### Dashboard & Calendar (DEV-31) - S3.5

**Priority:** MEDIUM

**Files:**

- `/lib/services/dashboard/dashboard.service.ts`
- `/lib/actions/dashboard.ts`
- `/lib/actions/calendar.ts`
- `/app/(dashboard)/dashboard/page.tsx`
- `/components/dashboard/StatCard.tsx`
- `/components/dashboard/ActivityFeed.tsx`
- `/components/calendar/EventCalendar.tsx`

**Tasks:**

- [ ] Create `dashboard.service.ts`
  - [ ] getDashboardStats(userId) - pending approvals, upcoming events, drafts, recent activity
  - [ ] getUpcomingEvents(userId, days)
  - [ ] getActivityFeed(userId, limit)
- [ ] Create `dashboard.ts` actions
  - [ ] getDashboardStats()
  - [ ] getUpcomingEvents(days)
  - [ ] getActivityFeed(limit)
- [ ] Create `calendar.ts` actions
  - [ ] getEventsForCalendar(startDate, endDate)
- [ ] Build dashboard page
  - [ ] Grid layout: stat cards + calendar + activity feed
- [ ] Build StatCard component
  - [ ] Icon, label, count
  - [ ] Clickable → navigate to relevant page
- [ ] Build ActivityFeed component
  - [ ] List of recent actions
  - [ ] User, action type, time ago
- [ ] Build EventCalendar component
  - [ ] Monthly calendar view
  - [ ] Use library: react-big-calendar or custom
  - [ ] Color-coded by status
  - [ ] Click event → detail modal
  - [ ] Navigation: prev/next month, today
- [ ] Install calendar library if needed
- [ ] Write tests
- [ ] Manual testing: Dashboard interactions

### Email Notifications (DEV-32) - S3.6

**Priority:** MEDIUM

**Files:**

- `/lib/services/email/email.service.ts`
- `/lib/services/email/templates.service.ts`

**Tasks:**

- [ ] Configure Supabase email or SMTP
- [ ] Create `email.service.ts`
  - [ ] sendMagicLink(email, token) - handled by Supabase
  - [ ] sendApprovalNotification(userId, eventId, type)
  - [ ] sendApprovalResultNotification(userId, eventId, approved)
  - [ ] sendModificationNotification(userId, eventId)
  - [ ] sendCancellationNotification(userId, eventId)
  - [ ] sendReportNotification(userId, eventId)
  - [ ] sendReportResultNotification(userId, eventId, approved)
  - [ ] Check user notification preferences before sending
- [ ] Create `templates.service.ts`
  - [ ] renderApprovalRequest(event, approver) - return HTML
  - [ ] renderApprovalResult(event, creator, approved, comment)
  - [ ] renderModificationRequest(event, changes, approver)
  - [ ] renderCancellationRequest(event, reason, approver)
  - [ ] renderReportRequest(event, report, approver)
  - [ ] Templates: header, content, CTA button, footer, unsubscribe
- [ ] Integrate email sending in services
  - [ ] After submitForApproval → email first approver
  - [ ] After approveEvent → email next approver or creator
  - [ ] After rejectEvent → email creator
  - [ ] Similar for modifications, cancellations, reports
- [ ] Create branded email templates (HTML files or in Supabase)
- [ ] Write email tests (check sending, not actual delivery)
- [ ] Manual testing: Trigger emails, verify content

### Error Handling & UI Polish (DEV-33) - S3.7

**Priority:** MEDIUM

**Files:**

- `/components/shared/ErrorBoundary.tsx`
- `/components/shared/LoadingSpinner.tsx`
- `/components/shared/ConfirmDialog.tsx`
- `/components/shared/PageHeader.tsx`
- `/components/shared/EmptyState.tsx`
- `/components/ui/skeletons/*`

**Tasks:**

- [ ] Create ErrorBoundary component
  - [ ] Wrap app
  - [ ] User-friendly error messages
  - [ ] "Try again" button
- [ ] Ensure all server actions return ActionResponse<T>
- [ ] Add toast notifications on all mutations (success/error)
- [ ] Create skeleton components
  - [ ] TableSkeleton
  - [ ] CardSkeleton
  - [ ] FormSkeleton
  - [ ] CalendarSkeleton
- [ ] Use React Suspense for streaming
- [ ] Add loading spinners on buttons during mutations
- [ ] Create ConfirmDialog component
  - [ ] Use shadcn/ui AlertDialog
  - [ ] For: delete draft, deactivate user, ban venue, request cancellation, reject approval
- [ ] Create PageHeader component
  - [ ] Title, breadcrumbs, actions
- [ ] Create EmptyState component
  - [ ] Icon, message, CTA button
- [ ] Review all pages for visual consistency
  - [ ] Spacing
  - [ ] Button styles
  - [ ] Form layouts
  - [ ] Table/card layouts
- [ ] Add hover states on interactive elements
- [ ] Ensure focus states are visible
- [ ] Write tests
- [ ] Manual testing: All error scenarios

### Final Testing & Bug Fixes (DEV-34) - S3.8

**Priority:** HIGH

**Estimated:** 16 hours (2 days)

**Functional Testing:**

- [ ] **Event Lifecycle:** Create draft → Submit → Multi-level Approval → Scheduled → Modify → Approve Mod → Complete → Report → Approve Report → Archived
- [ ] **Rejection Flow:** Create → Submit → Reject → Create new from rejected
- [ ] **Cancellation Flow:** Create → Approve → Request Cancel → Approve Cancellation
- [ ] **Pyramid Visibility:** Test with users at different levels
- [ ] **Approval Chains:** Test with different configs, test skip logic

**Edge Cases:**

- [ ] Concurrent modifications to same event
- [ ] User deactivated mid-approval chain
- [ ] Event date passes while in approval
- [ ] Duplicate venue creation
- [ ] Orphaned users (parent deleted)
- [ ] Multiple drafts management

**UI/UX Testing:**

- [ ] All forms with validation errors
- [ ] All buttons and links
- [ ] All modals and dialogs
- [ ] Navigation flow
- [ ] Desktop browsers (Chrome, Firefox, Safari)

**Bug Fixes:**

- [ ] Fix bugs found during testing
- [ ] Refine error messages
- [ ] Improve loading states
- [ ] Polish animations/transitions

**Demo Preparation:**

- [ ] Seed demo data (realistic events, users, approvals)
- [ ] Prepare demo script
- [ ] Test demo flow
- [ ] Document known issues for post-MVP

## 🚫 Excluded from MVP

- [ ] Template features (all)
  - [ ] Template CRUD
  - [ ] Save as template
  - [ ] Load from template
- [ ] Google Maps integration (pending API key)
- [ ] Mobile responsive design
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Rate limiting
- [ ] Advanced analytics
- [ ] Batch operations
- [ ] Advanced search

## 📝 Notes

- **Testing:** Write tests alongside each feature
- **Database:** Migrations applied incrementally
- **Git:** Commit after each completed task
- **Linear:** Update issue status after completion
- **Demo:** Keep demo environment up to date