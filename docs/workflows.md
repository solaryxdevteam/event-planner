# Event Management Platform - Workflows

This document describes all business process workflows in the hierarchical event management platform.

---

## Table of Contents

1. [User Hierarchy & Permissions](#user-hierarchy--permissions)
2. [Event Creation & Draft Workflow](#event-creation--draft-workflow)
3. [Event Approval Workflow](#event-approval-workflow)
4. [Event Modification Workflow](#event-modification-workflow)
5. [Event Cancellation Workflow](#event-cancellation-workflow)
6. [Post-Event Reporting Workflow](#post-event-reporting-workflow)
7. [Venue Management Workflow](#venue-management-workflow)
8. [User Management Workflow](#user-management-workflow)
9. [Template Management Workflow](#template-management-workflow)
10. [Notification Workflow](#notification-workflow)

---

## User Hierarchy & Permissions

### Organizational Structure

```
Global Director (Level 5)
    ↓
Lead Curator (Level 4)
    ↓
Regional Curator (Level 3)
    ↓
City Curator (Level 2)
    ↓
Event Planner (Level 1)
```

### Pyramid Visibility Rules

- **Event Planner**: Can only see their own events
- **City Curator**: Can see their own events + events from Event Planners under them
- **Regional Curator**: Can see events from City Curators and Event Planners in their region
- **Lead Curator**: Can see events from Regional Curators and all below
- **Global Director**: Can see all events across the entire organization

**Implementation**: Uses PostgreSQL recursive CTE function `get_subordinate_user_ids(user_id)` to fetch visible user IDs.

### Role-Based Permissions

| Action              | Event Planner | City Curator | Regional Curator | Lead Curator | Global Director |
| ------------------- | ------------- | ------------ | ---------------- | ------------ | --------------- |
| Create Events       | ✓             | ✓            | ✓                | ✓            | ✓               |
| Approve Events      | -             | ✓            | ✓                | ✓            | ✓               |
| Manage Users        | -             | -            | -                | -            | ✓               |
| Ban Venues          | -             | -            | -                | -            | ✓               |
| Configure Approvals | -             | -            | -                | -            | ✓               |

---

## Event Creation & Draft Workflow

### State Diagram

```
[No Event]
    ↓
[Create New] → [Draft]
    ↓           ↑ ↓
[Auto-save]    [Edit]
    ↓           ↑ ↓
[Continue]     [Delete]
    ↓
[Submit] → [In Review]
```

### Detailed Flow

#### 1. **Start New Event**

**Actor**: Any authenticated user with event creation permission

**Steps**:

1. User navigates to `/events/new`
2. System checks for existing draft:
   - If draft exists → Show dialog: "Continue editing or start new?"
   - If "Start new" → Delete old draft
3. Display multi-step event creation form

#### 2. **Fill Event Details (Multi-Step Form)**

**Step 1 - Basic Information**:

- Title (required)
- Description (required)
- Event Date (required, must be future date)
- Event Time (required)

**Step 2 - Venue Selection**:

- Select from existing venues (dropdown with search)
- OR Quick-add new venue inline
- Venue details: name, address, city, capacity

**Step 3 - Event Details**:

- Expected Attendance (number)
- Budget (optional)
- Notes (optional)

**Step 4 - Review & Submit**:

- Review all entered information
- Options:
  - "Save as Draft" (manual)
  - "Save as Template" (for reuse)
  - "Submit for Approval"

#### 3. **Auto-Save Draft**

**Trigger**: Every 30 seconds while editing (debounced)

**Process**:

1. Validate current form data
2. Call `updateEventDraft(eventId, formData)`
3. Save to database with status = 'draft'
4. Show toast: "Draft saved"
5. Continue editing

**Storage**:

- Table: `events`
- Status: `draft`
- Creator: Current user ID

#### 4. **Save as Template**

**Trigger**: User clicks "Save as Template"

**Process**:

1. Show dialog: "Template name?"
2. Copy event data to `templates` table
3. Associate with current user
4. Show toast: "Template saved"
5. Template available in future event creation

#### 5. **Load from Template**

**Trigger**: User selects template from dropdown

**Process**:

1. Fetch template data
2. Pre-fill form fields with template values
3. Clear event-specific data (date, time)
4. User can modify before submitting

#### 6. **Submit for Approval**

**Trigger**: User clicks "Submit for Approval" on review step

**Validation**:

- All required fields filled
- Event date is in the future
- Venue selected
- Expected attendance > 0

**Process**:

1. Validate form data
2. Call `submitEventForApproval(eventId)`
3. Backend builds approval chain (see Approval Workflow)
4. Update event status: `draft` → `in_review`
5. Create approval records with sequence order
6. Send email notification to first approver
7. Create audit log entry
8. Redirect user to `/events/requests?tab=in-review`
9. Show toast: "Event submitted for approval"

#### 7. **Delete Draft**

**Trigger**: User clicks "Delete Draft"

**Process**:

1. Show confirmation dialog: "Are you sure?"
2. If confirmed:
   - Call `deleteDraft(eventId)`
   - Hard delete from database (only drafts can be hard deleted)
   - Show toast: "Draft deleted"
   - Redirect to `/events/requests`

---

## Event Approval Workflow

### Approval Chain Building

#### Chain Construction Logic

**Function**: `buildApprovalChain(creatorId)`

**Process**:

1. Start with creator's parent
2. Walk up hierarchy to Global Director
3. Filter by approval config (which roles are required)
4. Return array of approver IDs in sequence

**Example Chain**:

```
Event Planner creates event
    ↓
Approval Chain: [City Curator, Regional Curator, Lead Curator, Global Director]
```

**Configurable Skipping**:

- Global Director can configure which roles are required
- Example: Skip Regional Curator level
- Modified chain: [City Curator, Lead Curator, Global Director]

### State Flow

```
[In Review]
    ↓
[Pending - City Curator] → [Approve] → [Pending - Regional Curator]
    ↓                                           ↓
[Reject]                                    [Approve] → [Pending - Lead Curator]
    ↓                                                           ↓
[Rejected]                                                  [Approve] → [Pending - Global Director]
                                                                            ↓
                                                                        [Approve]
                                                                            ↓
                                                                    [Approved - Scheduled]
```

### Detailed Approval Flow

#### 1. **Approver Receives Notification**

**Trigger**: Event submitted OR previous approver approved

**Notification**:

- Email sent to current approver
- Subject: "New Event Approval Request: [Event Title]"
- Contains:
  - Event details (title, date, venue, creator)
  - Link to approval page
  - Approval chain progress

**Dashboard Indicator**:

- "Pending Approvals" count updated
- Event appears in `/approvals` page under "Events" tab

#### 2. **Approver Reviews Event**

**Actor**: User in approval chain

**Interface**: `/approvals` page

**Display**:

- Event details card
- Creator information
- Venue details
- Expected attendance, budget
- Approval chain progress stepper
- Comment text area (optional for approval, mandatory for rejection)
- Actions: Approve / Reject buttons

#### 3a. **Approve Event**

**Trigger**: Approver clicks "Approve"

**Validation**:

- User must be current approver in sequence
- Approval status must be "pending"
- Comment is optional

**Process**:

1. Update approval record:
   - Status: `pending` → `approved`
   - Comment saved
   - Timestamp recorded
2. Check if last approver in chain:
   - **If last**:
     - Update event status: `in_review` → `approved_scheduled`
     - Send notification to creator: "Event approved!"
     - Create audit log: "Event approved by [Name]"
   - **If not last**:
     - Update next approval status: `waiting` → `pending`
     - Send notification to next approver
     - Create audit log: "Approved by [Name], forwarded to [Next Name]"
3. Show toast: "Event approved"
4. Refresh approvals list

#### 3b. **Reject Event**

**Trigger**: Approver clicks "Reject"

**Validation**:

- User must be current approver in sequence
- Comment is **MANDATORY** (rejection reason)

**Process**:

1. Show confirmation dialog with comment textarea
2. Update approval record:
   - Status: `pending` → `rejected`
   - Comment saved (required)
   - Timestamp recorded
3. Update event status: `in_review` → `rejected`
4. Cancel remaining approvals in chain (set to `cancelled`)
5. Send notification to creator with rejection reason
6. Create audit log: "Event rejected by [Name]: [reason]"
7. Show toast: "Event rejected"

#### 4. **Creator Handles Rejected Event**

**Options**:

**Option A - Create New from Rejected**:

1. Navigate to `/events/requests?tab=rejected`
2. Click "Create New from This" on rejected event
3. System copies event data to new draft
4. Creator can modify and resubmit
5. Original rejected event remains in history

**Option B - View Feedback**:

1. View rejection comments from approver
2. Understand what needs to change
3. Use as reference for future events

---

## Event Modification Workflow

### When Modifications Are Allowed

**Eligible Events**:

- Status: `approved_scheduled` (approved but not yet occurred)
- No pending modification already exists
- No pending cancellation exists

**Who Can Request**:

- Event creator only

### State Flow

```
[Approved - Scheduled]
    ↓
[Request Modification] → Create Version Record
    ↓
[Modification In Review]
    ↓
[Approval Chain] → Same as original event
    ↓              (City Curator → Regional → Lead → Global)
[Approved] → Apply changes to event
    ↓
[Approved - Scheduled] (updated)

OR

[Rejected] → Version deleted, original remains
```

### Detailed Modification Flow

#### 1. **Request Modification**

**Trigger**: Creator clicks "Request Modification" on event detail page

**Preconditions**:

- Event status = `approved_scheduled`
- No existing pending modification
- User is event creator

**Interface**:

1. Display modal with pre-filled form (current event data)
2. User can modify any field:
   - Title, description, date, time
   - Venue
   - Expected attendance, budget, notes
3. System highlights changed fields
4. Show diff preview (old → new)

**Process**:

1. User submits modification form
2. Validate changes (at least one field changed)
3. Create record in `event_versions` table:
   - event_id: Reference to original event
   - version_data: JSON with proposed changes
   - status: `pending`
4. Build approval chain (same as original event)
5. Create approval records for modification type
6. Send email to first approver
7. Create audit log: "Modification requested by [Creator]"
8. Show toast: "Modification request submitted"
9. Event card shows "Modification Pending" badge

#### 2. **Approver Reviews Modification**

**Interface**: `/approvals` page, "Modifications" tab

**Display**:

- Original event details
- Proposed changes (diff view)
- Change summary: "3 fields changed"
- Side-by-side comparison:
  - Old value → New value (highlighted)
- Approval chain progress
- Comment textarea
- Approve / Reject buttons

#### 3a. **Approve Modification**

**Process**:

1. Update approval record: `approved`
2. Check if last approver:
   - **If last**:
     - Apply changes to original event
     - Archive old version in `event_versions` (status: `archived`)
     - Delete pending version
     - Send notification to creator: "Modification approved"
     - Create audit log: "Modification approved by [Name]"
   - **If not last**:
     - Forward to next approver
     - Send notification to next approver
3. Show toast: "Modification approved"

#### 3b. **Reject Modification**

**Validation**: Comment mandatory

**Process**:

1. Update approval record: `rejected` with comment
2. Update version status: `pending` → `rejected`
3. Original event remains unchanged
4. Send notification to creator with reason
5. Create audit log: "Modification rejected by [Name]: [reason]"
6. Remove "Modification Pending" badge from event
7. Show toast: "Modification rejected"

---

## Event Cancellation Workflow

### When Cancellations Are Allowed

**Eligible Events**:

- Status: `approved_scheduled` (approved but not yet occurred)
- No pending cancellation already exists

**Who Can Request**:

- Configurable by Global Director
- Default: Event creator + all users in approval chain

### State Flow

```
[Approved - Scheduled]
    ↓
[Request Cancellation] → Create cancellation request
    ↓
[Cancellation In Review]
    ↓
[Approval Chain] → Higher roles only
    ↓              (Typically: Lead Curator + Global Director)
[Approved] → Event cancelled
    ↓
[Cancelled]

OR

[Rejected] → Cancellation denied, event proceeds
    ↓
[Approved - Scheduled]
```

### Detailed Cancellation Flow

#### 1. **Request Cancellation**

**Trigger**: User clicks "Request Cancellation" on event detail page

**Preconditions**:

- Event status = `approved_scheduled`
- No existing pending cancellation
- User has cancellation permission (check config)

**Interface**:

1. Show warning dialog:
   - "⚠️ This will request to cancel the event"
   - "This action requires approval from [roles]"
2. Reason textarea (mandatory)
3. Confirm / Cancel buttons

**Process**:

1. User enters reason and confirms
2. Create cancellation request record
3. Build cancellation approval chain:
   - Typically higher roles only (Lead Curator + Global Director)
   - Defined in approval config
4. Create approval records for cancellation type
5. Send email to first approver
6. Create audit log: "Cancellation requested by [Name]: [reason]"
7. Show toast: "Cancellation request submitted"
8. Event card shows "Cancellation Pending" badge

#### 2. **Approver Reviews Cancellation**

**Interface**: `/approvals` page, "Cancellations" tab

**Display**:

- Event details (full information)
- Cancellation reason (from requester)
- Requester information
- Event date proximity warning if event is soon
- Approval chain progress
- Comment textarea
- Approve / Reject buttons

#### 3a. **Approve Cancellation**

**Process**:

1. Update approval record: `approved`
2. Check if last approver:
   - **If last**:
     - Update event status: `approved_scheduled` → `cancelled`
     - Delete cancellation request
     - Send notification to creator: "Event cancelled"
     - Send notification to all in original approval chain
     - Create audit log: "Event cancelled by [Name]"
   - **If not last**:
     - Forward to next approver
     - Send notification to next approver
3. Show toast: "Cancellation approved"

#### 3b. **Reject Cancellation**

**Validation**: Comment mandatory

**Process**:

1. Update approval record: `rejected` with comment
2. Delete cancellation request
3. Event remains status: `approved_scheduled`
4. Send notification to requester with reason
5. Create audit log: "Cancellation rejected by [Name]: [reason]"
6. Remove "Cancellation Pending" badge
7. Show toast: "Cancellation request rejected"

---

## Post-Event Reporting Workflow

### Auto Status Transition

**Trigger**: Daily cron job (midnight) or database trigger

**Process**:

1. Find all events where:
   - `event_date` < today
   - `status` = `approved_scheduled`
2. Update status: `approved_scheduled` → `completed_awaiting_report`
3. Send notification to event creator: "Please submit report"
4. Create audit log: "Event completed, awaiting report"

### State Flow

```
[Approved - Scheduled]
    ↓ (event date passes)
[Completed - Awaiting Report]
    ↓
[Submit Report] → Upload media + details
    ↓
[Report In Review]
    ↓
[Approval Chain] → Same as original event
    ↓
[Approved] → Report finalized
    ↓
[Completed - Archived]

OR

[Rejected] → Report rejected, resubmit required
    ↓
[Completed - Awaiting Report]
```

### Detailed Reporting Flow

#### 1. **Event Completes**

**Automatic Process**:

1. Event date passes
2. Status automatically updated to `completed_awaiting_report`
3. Creator receives email: "Submit report for [Event Title]"
4. Event appears in "Past Events > Completed" tab
5. "Submit Report" button visible to creator

#### 2. **Submit Report**

**Trigger**: Creator clicks "Submit Report" on event detail page

**Preconditions**:

- Event status = `completed_awaiting_report`
- User is event creator

**Interface**: Report submission form with sections:

**Section 1 - Attendance**:

- Actual attendance count (required, number)

**Section 2 - Summary**:

- Event summary (required, rich text, 100-1000 characters)
- What went well?
- What could be improved?

**Section 3 - Feedback**:

- Participant feedback (optional, text)
- Partner feedback (optional, text)

**Section 4 - Media Upload**:

- Drag-and-drop file upload
- Multiple files supported
- Accepted formats: images (jpg, png, gif), videos (mp4, mov)
- Max file size: 50MB per file
- Progress bars during upload
- Thumbnail previews
- Remove file option

**Section 5 - External Links**:

- Social media posts (optional)
- News articles (optional)
- Photo galleries (optional)
- Add multiple links

**Process**:

1. User fills form and uploads media
2. Validate required fields
3. Upload media files to Supabase Storage:
   - Bucket: `reports`
   - Path: `reports/{eventId}/{filename}`
4. Create record in `reports` table:
   - event_id, attendance_count, summary, feedback
   - media_urls (JSON array of uploaded files)
   - external_links (JSON array)
   - status: `pending`
5. Build approval chain (same as original event)
6. Create approval records for report type
7. Send email to first approver
8. Create audit log: "Report submitted by [Creator]"
9. Show toast: "Report submitted for approval"
10. Redirect to event detail (now showing submitted report)

#### 3. **Approver Reviews Report**

**Interface**: `/approvals` page, "Reports" tab

**Display**:

- Original event details
- Report details:
  - Actual attendance vs expected attendance
  - Summary and feedback
  - Media gallery with lightbox viewer
  - External links
- Approval chain progress
- Comment textarea
- Approve / Reject buttons

#### 4a. **Approve Report**

**Process**:

1. Update approval record: `approved`
2. Check if last approver:
   - **If last**:
     - Update event status: `completed_awaiting_report` → `completed_archived`
     - Update report status: `pending` → `approved`
     - Send notification to creator: "Report approved"
     - Create audit log: "Report approved by [Name]"
   - **If not last**:
     - Forward to next approver
     - Send notification to next approver
3. Show toast: "Report approved"

#### 4b. **Reject Report**

**Validation**: Comment mandatory with specific feedback

**Process**:

1. Update approval record: `rejected` with comment
2. Update report status: `pending` → `rejected`
3. Event status remains: `completed_awaiting_report`
4. Send notification to creator with specific issues
5. Create audit log: "Report rejected by [Name]: [reason]"
6. Show toast: "Report rejected"
7. Creator can edit and resubmit report

#### 5. **Resubmit Report (After Rejection)**

**Trigger**: Creator clicks "Edit Report" on rejected report

**Process**:

1. Load existing report data into form
2. User can modify all fields
3. Can add/remove media files
4. Submit follows same flow as initial submission
5. New approval chain created
6. Audit log: "Report resubmitted by [Creator]"

---

## Venue Management Workflow

### Venue Creation Flow

```
[New Venue Form]
    ↓
[Check for Duplicate] → Same name + address + creator?
    ↓                       ↓
[No] → Insert new      [Yes] → Update existing (reactivate if soft-deleted)
    ↓
[Venue Available]
```

### Detailed Venue Flow

#### 1. **Create Venue**

**Trigger**: User creates event and needs to add venue, OR manages venues from `/venues` page

**Interface**:

- Modal or inline form with fields:
  - Name (required)
  - Address (required)
  - City (required)
  - Capacity (optional, number)
  - Notes (optional)

**Duplicate Detection**:

1. User enters venue name and address
2. On blur or submit, check for duplicate:
   - Query: Same name AND same address AND same creator
3. If duplicate found:
   - Show warning: "You've already added this venue"
   - Options:
     - "Use Existing" → Select existing venue
     - "Create Anyway" → Create new record (rare case)

**Process**:

1. Validate form data
2. Check for duplicate
3. If duplicate exists and is soft-deleted:
   - Reactivate by setting `is_active = true`
   - Update other fields if changed
4. If no duplicate:
   - Insert new venue record
   - Set creator_id = current user
5. Create audit log: "Venue created: [Name]"
6. Show toast: "Venue added"
7. Venue available for event selection

#### 2. **Edit Venue**

**Who Can Edit**: Venue creator

**Process**:

1. User clicks "Edit" on venue
2. Load venue data into form
3. User modifies fields
4. Save updates
5. Create audit log: "Venue updated: [Name]"
6. Show toast: "Venue updated"

#### 3. **Delete Venue (Soft Delete)**

**Who Can Delete**: Venue creator

**Process**:

1. User clicks "Delete" on venue
2. Show confirmation: "Are you sure? Events using this venue will still show it."
3. If confirmed:
   - Set `is_active = false`
   - Create audit log: "Venue deleted: [Name]"
   - Show toast: "Venue deleted"
4. Venue hidden from future selections
5. Existing events using venue still display it

#### 4. **Ban Venue (Global Director Only)**

**Who Can Ban**: Global Director only

**Use Case**: Problematic venue used by multiple users

**Process**:

1. Global Director navigates to `/venues`
2. Clicks "Ban" on venue
3. Show confirmation with reason textarea
4. If confirmed:
   - Set `is_active = false` for ALL instances across all creators
   - Create audit log: "Venue banned by Global Director: [reason]"
   - Send notification to all users who have used this venue
   - Show toast: "Venue banned globally"
5. Venue hidden for all users
6. Existing events still display it (read-only)

### Pyramid Visibility for Venues

**Rule**: Users can see venues created by themselves or their subordinates

**Example**:

- Event Planner A creates "Downtown Conference Center"
- City Curator B (parent of A) can see it
- Event Planner C (different city) cannot see it
- Regional Curator D (parent of B) can see it

**Implementation**: RLS policy using `get_subordinate_user_ids()`

---

## User Management Workflow

### User Creation Flow (Global Director Only)

```
[User Form]
    ↓
[Select Role]
    ↓
[Select Parent] → Must be valid for role hierarchy
    ↓
[Create User] → Send magic link invitation
    ↓
[User Receives Email]
    ↓
[User Sets Password]
    ↓
[User Active]
```

### Detailed User Management Flow

#### 1. **Create User**

**Who Can Create**: Global Director only

**Interface**: `/admin/users` page

**Process**:

1. Click "Add User" button
2. Fill form:
   - Email (required, unique)
   - Name (required)
   - Role (dropdown: Event Planner → Global Director)
   - Parent (dropdown: filtered by valid parents for role)
   - City (required for Event Planner, City Curator)
   - Region (required for Regional Curator)
3. If role = Global Director:
   - Show extra confirmation
   - Require Global Director password re-entry
4. Submit form
5. Backend validates:
   - Email unique
   - Parent valid for role
   - No circular references
6. Create user record:
   - is_active = true by default
7. Send magic link invitation email via Supabase Auth
8. Create audit log: "User created: [Name] as [Role]"
9. Show toast: "User created and invitation sent"

#### 2. **User Accepts Invitation**

**Process**:

1. User receives email with magic link
2. Clicks link
3. Redirected to login page
4. Automatically authenticated
5. Prompted to complete profile (optional avatar, phone)
6. Redirected to dashboard

#### 3. **Edit User**

**Who Can Edit**: Global Director

**What Can Be Edited**:

- Name
- Role (with parent update if needed)
- Parent (validate hierarchy)
- City, Region
- Notification preferences (by user themselves)

**Process**:

1. Click "Edit" on user row
2. Load user data into form
3. Modify fields
4. Validate hierarchy changes
5. Update user record
6. Create audit log: "User updated: [changes]"
7. Show toast: "User updated"

#### 4. **Deactivate User**

**Who Can Deactivate**: Global Director

**Use Case**: User leaves organization

**Process**:

1. Click "Deactivate" on user
2. Show confirmation: "This will prevent login and remove from approval chains"
3. If confirmed:
   - Set `is_active = false`
   - Remove from future approval chains
   - Existing approvals remain (show as "[User] (Deactivated)")
   - Events created remain visible
   - Create audit log: "User deactivated: [Name]"
   - Show toast: "User deactivated"

#### 5. **View Hierarchy Tree**

**Interface**: `/admin/users` page, "Hierarchy" tab

**Display**:

- Tree visualization with Global Director at top
- Each node shows: avatar, name, role
- Expandable/collapsible branches
- Click node → show user details
- Highlight path for selected user

---

## Template Management Workflow

### Template Flow

```
[Existing Event or Draft]
    ↓
[Save as Template] → Store in templates table
    ↓
[Template Available]
    ↓
[New Event] → Load from Template → Pre-filled form
    ↓
[Modify & Submit]
```

### Detailed Template Flow

#### 1. **Save Event as Template**

**Trigger**: During event creation or from existing event

**Interface**:

- Button: "Save as Template"
- Modal with template name input

**What Gets Saved**:

- Title (as template name or custom name)
- Description
- Venue (reference)
- Expected attendance
- Budget
- Notes

**What Does NOT Get Saved**:

- Event date, time (event-specific)
- Creator (assigned on use)
- Status
- Approval chain

**Process**:

1. User clicks "Save as Template"
2. Enter template name
3. System copies relevant fields to JSON
4. Insert into `templates` table:
   - user_id: current user
   - name: template name
   - template_data: JSON object
5. Show toast: "Template saved"

#### 2. **Load from Template**

**Trigger**: Creating new event

**Interface**: Dropdown on event creation form

**Process**:

1. User selects template from dropdown
2. System loads template_data JSON
3. Pre-fill form fields with template values
4. Clear event-specific fields (date, time)
5. User can modify any field before submitting
6. Proceed with normal event creation flow

#### 3. **Delete Template**

**Trigger**: User clicks "Delete" on template

**Process**:

1. Show confirmation
2. Hard delete from templates table
3. Show toast: "Template deleted"

#### 4. **Edit Template**

**Note**: Not directly supported in MVP

**Workaround**:

1. Load template into new event
2. Modify fields
3. Save as new template (optionally delete old one)

---

## Notification Workflow

### Email Notification Triggers

| Trigger                      | Recipient               | Email Type                        |
| ---------------------------- | ----------------------- | --------------------------------- |
| Event submitted for approval | First approver          | Approval request                  |
| Event approved (not final)   | Next approver           | Approval request                  |
| Event approved (final)       | Creator                 | Approval success                  |
| Event rejected               | Creator                 | Rejection with reason             |
| Modification requested       | First approver          | Modification approval request     |
| Modification approved        | Creator                 | Modification approved             |
| Modification rejected        | Creator                 | Modification rejected with reason |
| Cancellation requested       | First approver          | Cancellation approval request     |
| Cancellation approved        | Creator + all approvers | Cancellation confirmed            |
| Cancellation rejected        | Requester               | Cancellation denied with reason   |
| Event completed              | Creator                 | Report submission reminder        |
| Report submitted             | First approver          | Report approval request           |
| Report approved              | Creator                 | Report approved                   |
| Report rejected              | Creator                 | Report rejected with feedback     |
| User created                 | New user                | Magic link invitation             |

### Email Template Structure

**All emails include**:

1. Header with app logo/name
2. Greeting: "Hi [Name],"
3. Main content with action details
4. CTA button with deep link to app
5. Footer with:
   - "Manage notification preferences" link
   - Organization name
   - Unsubscribe option (respects notification_prefs)

### Notification Preferences

**Stored in**: `users.notification_prefs` (JSONB)

**Schema**:

```json
{
  "email_enabled": true,
  "frequency": "instant", // instant | daily | weekly
  "types": {
    "approvals": true,
    "results": true,
    "reminders": true,
    "system": true
  }
}
```

**Frequency Behavior**:

- **Instant**: Email sent immediately on trigger
- **Daily**: Emails queued, sent once per day at 8am local time (future enhancement)
- **Weekly**: Emails queued, sent once per week on Monday (future enhancement)

**MVP Implementation**: Only "instant" frequency supported

### Deep Links in Emails

**Format**: `https://app.domain.com/path?token=auth_token`

**Examples**:

- Approval request: `/approvals?event_id=xxx`
- Event approved: `/events/xxx`
- Report reminder: `/events/xxx#report`
- User invitation: `/login?token=magic_link_token`

---

## Summary: Complete Event Lifecycle

### Happy Path (No Modifications/Cancellations)

```
1. Event Planner creates draft
2. Auto-save preserves work
3. Planner submits for approval
4. City Curator approves → forwards
5. Regional Curator approves → forwards
6. Lead Curator approves → forwards
7. Global Director approves → Event scheduled
8. Event date arrives
9. Status auto-updates to "Awaiting Report"
10. Planner submits report with media
11. Approval chain reviews report
12. Report approved
13. Event archived
```

**Timeline**: 2-7 days for approvals, event duration, 1-3 days for report approval

### Complex Path (With Modifications)

```
1-7. (Same as above)
8. Event scheduled
9. Planner requests modification (date change)
10. Approval chain reviews modification
11. Modification approved, event updated
12. New event date arrives
13-15. (Report flow same as above)
```

### Cancellation Path

```
1-7. (Same as above through approval)
8. Event scheduled
9. External issue arises
10. Planner or Curator requests cancellation
11. Higher-level approval chain reviews
12. Cancellation approved
13. Event marked as cancelled
14. Stakeholders notified
```

---

## Audit Trail Throughout All Workflows

**Every action creates an audit log entry with**:

- event_id (if applicable)
- user_id (actor)
- action_type (enum)
- comment (if provided)
- metadata (JSON with additional context)
- created_at (timestamp)

**Visible in**:

- Event detail page (timeline view)
- Admin audit log page (filterable)
- User activity page

**Use cases**:

- Accountability: Who approved/rejected and when
- Debugging: Track event state changes
- Reporting: Analyze approval times, rejection rates
- Compliance: Complete history of all actions

---

This comprehensive workflow documentation provides a complete reference for all business processes in the Event Management Platform. Each workflow includes state diagrams, detailed steps, validation rules, and integration points with other workflows.
