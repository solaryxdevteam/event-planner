# Developer Guide — Shiraz House Event Planner

A complete reference for developers joining this project, from initial setup through understanding the full system.

### Documentation map

| Document                              | Purpose                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| **This guide**                        | Setup, env, repo layout, database, integrations, day-to-day workflow |
| [Backend Guide](./BACKEND_GUIDE.md)   | API routes, services, DAL, validation, auth on the server            |
| [Frontend Guide](./FRONTEND_GUIDE.md) | UI structure, React Query, client services, building features        |
| [architecture.md](./architecture.md)  | High-level architecture notes (auth flows, patterns)                 |
| [db/README.md](../db/README.md)       | Schema files, RLS, migrations, troubleshooting                       |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Project Setup](#4-project-setup)
5. [Environment Variables](#5-environment-variables)
6. [Project Structure](#6-project-structure)
7. [Database](#7-database)
8. [Authentication & Roles](#8-authentication--roles)
9. [External Integrations](#9-external-integrations)
10. [Available Scripts](#10-available-scripts)
11. [Development Workflow](#11-development-workflow)
12. [Frontend ↔ backend integration](#12-frontend--backend-integration)

---

## 1. Project Overview

**Shiraz House Event Planner** is an internal management platform for planning, approving, and reporting on events. It supports a multi-level organizational hierarchy where events go through a structured approval workflow before being scheduled.

**Core capabilities:**

- Event lifecycle management (draft → review → approved → completed → archived)
- Multi-level approval chains tied to user roles
- Venue and DJ profile management with email contact verification
- Post-event report submission and approval
- Full audit trail on every action
- Role-based access control across all features

---

## 2. Tech Stack

| Layer             | Technology                      | Version   |
| ----------------- | ------------------------------- | --------- |
| Framework         | Next.js (App Router)            | 16.x      |
| Language          | TypeScript                      | 5.x       |
| UI                | React                           | 19.x      |
| Styling           | Tailwind CSS v4 + PostCSS       | 4.x       |
| Component Library | shadcn/ui (Radix UI primitives) | —         |
| Forms             | React Hook Form + Zod           | 7.x / 4.x |
| Data Fetching     | TanStack React Query            | 5.x       |
| Client State      | Zustand                         | 5.x       |
| Database          | PostgreSQL via Supabase         | —         |
| Auth              | Supabase Auth                   | —         |
| Email             | Resend                          | 6.x       |
| File Storage      | Supabase Storage                | —         |
| Maps              | Leaflet + React Leaflet         | 1.x / 5.x |
| Charts            | Chart.js + React ChartJS2       | 4.x / 5.x |
| Animations        | Framer Motion                   | 12.x      |
| Testing           | Vitest + React Testing Library  | —         |
| Linting           | ESLint 9 + Prettier 3           | —         |
| Git Hooks         | Husky + lint-staged             | —         |

---

## 3. Prerequisites

Before setting up, ensure you have:

- **Node.js** >= 20 (LTS recommended)
- **npm** >= 10
- **Git**
- **Supabase account** (free tier is fine for development)
- **Resend account** (for email features, free tier available)

To verify:

```bash
node -v   # should be >= 20
npm -v    # should be >= 10
```

---

## 4. Project Setup

### Step 1 — Clone the repository

```bash
git clone <repo-url>
cd event-planner-app
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Set up environment variables

Copy the example env file and fill in the values (see [Section 5](#5-environment-variables)):

```bash
cp .env.example .env.local
```

### Step 4 — Set up Supabase

**Option A — Use Supabase Cloud (easiest)**

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Copy your project URL, anon key, and service role key into `.env.local`.
3. Run the schema against your new project:
   - Open the Supabase SQL editor.
   - Paste and run the contents of `db/schema.sql`.
4. (Optional) Seed location data:
   ```bash
   npm run seed:locations
   ```

**Option B — Use local Supabase (requires Docker Desktop)**

```bash
npx supabase start          # starts local Supabase stack
npx supabase db reset       # applies schema.sql + seed files
```

The local URLs will be printed in the terminal. Put them in `.env.local`.

### Step 5 — Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/auth/login`.

### Step 6 — Create the first user

Because registration is invitation-based, you need to create the first user manually in Supabase:

1. Go to **Supabase Dashboard → Authentication → Users** → "Add user".
2. Create a user with an email and password.
3. Go to **Table Editor → users** and insert a row for this user with:
   - `id` = the UUID from Supabase Auth
   - `email` = the same email
   - `role` = `global_director`
   - `status` = `active`
   - `is_active` = `true`
4. Log in with those credentials.

After that, you can invite other users through the app's User Management section.

---

## 5. Environment Variables

Create `.env.local` for local development. Never commit this file.

### Required variables

```bash
# ─── Supabase ────────────────────────────────────────────────────────────────
# Your Supabase project URL (found in Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Optional: project ref string (documentation/CLI only — not read by app code unless you add usage)
# NEXT_PUBLIC_SUPABASE_PROJECT_REF=your-project-ref

# Anon (public) key — safe to expose to browser
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service role key — NEVER expose to browser, server-side only
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── Email (Resend) ───────────────────────────────────────────────────────────
# Get from resend.com dashboard
RESEND_API_KEY=re_...

# The "From" email address (must be a verified domain in Resend)
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ─── App Config ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=Shiraz House
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPPORT_EMAIL=support@yourdomain.com

# ─── Security ────────────────────────────────────────────────────────────────
# Used for encrypting sensitive fields. Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXT_PUBLIC_ENCRYPTION_KEY=base64encodedkey==
ENCRYPTION_KEY=base64encodedkey==

# Random string used to authenticate cron job endpoint
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRON_SECRET=your-random-hex-string

# ─── Database sync (db:sync:pull / db:sync:push) ─────────────────────────────
# See scripts/sync.sh — requires REMOTE_DB_URL (and optionally LOCAL_DB_URL for non-default local ports)
# REMOTE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# ─── Dev Tools ───────────────────────────────────────────────────────────────
# Set to "true" to enable email template preview at /dashboard/dev/email-templates
NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW=true
```

### Variable reference

| Variable                           | Exposed to Browser | Purpose                                           |
| ---------------------------------- | ------------------ | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`         | Yes                | Supabase project endpoint                         |
| `NEXT_PUBLIC_SUPABASE_PROJECT_REF` | Yes                | Optional; not required by runtime code (CLI/docs) |
| `REMOTE_DB_URL` / `LOCAL_DB_URL`   | No                 | Used by `scripts/sync.sh` for data sync only      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Yes                | Public key for browser-side Supabase calls        |
| `SUPABASE_SERVICE_ROLE_KEY`        | No                 | Bypasses RLS for server-side operations           |
| `RESEND_API_KEY`                   | No                 | Resend email API authentication                   |
| `RESEND_FROM_EMAIL`                | No                 | Sender address for all outgoing emails            |
| `NEXT_PUBLIC_APP_NAME`             | Yes                | Application display name                          |
| `NEXT_PUBLIC_APP_URL`              | Yes                | Full URL of this app (used in emails)             |
| `NEXT_PUBLIC_SITE_URL`             | Yes                | Main marketing site URL                           |
| `SUPPORT_EMAIL`                    | No                 | Contact address shown in emails                   |
| `NEXT_PUBLIC_ENCRYPTION_KEY`       | Yes                | Client-side encryption operations                 |
| `ENCRYPTION_KEY`                   | No                 | Server-side encryption operations                 |
| `CRON_SECRET`                      | No                 | Authenticates the `/api/cron/*` endpoint          |
| `NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW` | Yes                | Toggles the dev email preview tool                |

> **Rule:** Any variable prefixed with `NEXT_PUBLIC_` is bundled into the client-side JavaScript. Never put secrets (service role key, API keys) in `NEXT_PUBLIC_` variables.

---

## 6. Project Structure

```
event-planner-app/
├── app/                        # Next.js App Router
│   ├── api/                    # API route handlers
│   ├── auth/                   # Public auth pages (login, register, verify-email)
│   ├── dashboard/              # Protected dashboard pages
│   ├── verify-venue/           # Public venue verification page
│   ├── verify-dj/              # Public DJ verification page
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Root redirect
│
├── components/
│   ├── ui/                     # shadcn/ui base components (do not edit directly)
│   ├── dashboard/              # Dashboard-level components
│   ├── events/                 # Event feature components
│   ├── venues/                 # Venue feature components
│   ├── djs/                    # DJ feature components
│   ├── users/                  # User management components
│   ├── approvals/              # Approval workflow components
│   ├── reports/                # Report components
│   ├── calendar/               # Calendar view components
│   ├── profile/                # Profile management components
│   ├── auth/                   # Auth flow components
│   ├── providers/              # Context providers (theme, query)
│   └── app-sidebar.tsx         # Main navigation sidebar
│
├── lib/
│   ├── auth/
│   │   ├── server.ts           # requireAuth(), requireRole() — server-side
│   │   └── client.ts           # signIn(), signOut() — client-side
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client (singleton)
│   │   └── server.ts           # Server Supabase client (per-request)
│   ├── data-access/            # Database queries (DAL layer)
│   │   └── *.dal.ts
│   ├── services/               # Business logic
│   │   ├── events/
│   │   ├── venues/
│   │   ├── djs/
│   │   ├── users/
│   │   ├── email/
│   │   ├── approvals/
│   │   ├── client/             # Client-side API call wrappers
│   │   └── ...
│   ├── hooks/                  # React Query hooks
│   │   └── use-*.ts
│   ├── validation/             # Zod schemas (shared between client and server)
│   │   └── *.schema.ts
│   ├── types/
│   │   ├── database.types.ts   # Auto-generated or hand-written DB types
│   │   ├── api.types.ts        # API request/response types
│   │   └── roles.ts            # Role enum
│   ├── permissions/            # Role-based access helpers
│   ├── utils/                  # Generic utilities (errors, formatters, etc.)
│   ├── constants/              # App-wide constants
│   └── calendar/               # Calendar-specific utilities
│
├── db/
│   ├── schema.sql              # Complete database schema — use for fresh installs
│   ├── seed.sql                # Sample data
│   ├── seed-locations.ts       # Script to seed geographic data
│   ├── migrations/             # Incremental migration files
│   └── enable_rls_policies.sql # Row-level security policies
│
├── scripts/
│   └── sync.sh                 # Database sync helper
│
├── tests/                      # Test files
├── public/                     # Static assets
├── middleware.ts               # Auth middleware (runs on every request)
├── next.config.ts              # Next.js configuration
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

### Layer responsibilities

| Layer           | Location               | Responsibility                                                    |
| --------------- | ---------------------- | ----------------------------------------------------------------- |
| Pages / Routes  | `app/`                 | Routing, page rendering, layout                                   |
| API Handlers    | `app/api/`             | HTTP handling, auth checks, input validation, response formatting |
| Services        | `lib/services/`        | Business logic, orchestration between DAL calls                   |
| DAL             | `lib/data-access/`     | Raw database queries, no business logic                           |
| Hooks           | `lib/hooks/`           | React Query wrappers for client-side data fetching                |
| Client Services | `lib/services/client/` | `fetch()` wrappers called by hooks                                |
| Validation      | `lib/validation/`      | Zod schemas, reused on both client and server                     |

---

## 7. Database

### Technology

PostgreSQL hosted on Supabase. There is no ORM — all queries use the Supabase JS client directly.

### Schema overview

The database uses custom PostgreSQL enums for all status fields:

| Enum              | Values                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `role`            | `event_planner`, `city_curator`, `regional_curator`, `lead_curator`, `global_director`, `marketing_manager`            |
| `event_status`    | `draft`, `in_review`, `rejected`, `approved_scheduled`, `completed_awaiting_report`, `completed_archived`, `cancelled` |
| `approval_status` | `waiting`, `pending`, `approved`, `rejected`                                                                           |
| `approval_type`   | `event`, `modification`, `cancellation`, `report`, `marketing_report`                                                  |
| `user_status`     | `pending`, `active`, `inactive`                                                                                        |

**Core tables:**

| Table                           | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `locations`                     | Geographic hierarchy (countries → states → cities)        |
| `users`                         | App users with roles, hierarchy (`parent_id`), and status |
| `invitations`                   | Token-based registration invitations                      |
| `venues`                        | Event venues (capacity, floor plans, media, contact)      |
| `djs`                           | DJ profiles (riders, music style, pricing)                |
| `events`                        | Event records with full lifecycle tracking                |
| `event_approvals`               | Per-level approval chain entries                          |
| `event_versions`                | Snapshot of every event change for history tracking       |
| `reports`                       | Post-event reports                                        |
| `marketing_reports`             | Marketing-specific reports tied to events                 |
| `audit_logs`                    | Immutable log of every action in the system               |
| `verification_otps`             | OTP codes for approval verification                       |
| `dj_contact_verifications`      | Email verification tokens for DJs                         |
| `venue_contact_verifications`   | Email verification tokens for venues                      |
| `user_email_verification_codes` | Email change verification codes                           |

### Row-Level Security (RLS)

RLS is enabled on all tables. The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS (server-side only). The anon key respects RLS policies. The policies are defined in `db/enable_rls_policies.sql`.

### Database commands

```bash
# Apply schema to remote Supabase project
npm run db:push

# Pull current remote schema
npm run db:pull

# Reset local database (drops and re-applies schema.sql)
npm run db:reset

# Link Supabase CLI to your remote project (run once; pass your project ref)
npx supabase link --project-ref YOUR_PROJECT_REF

# Sync data between environments (set REMOTE_DB_URL in .env.local — see scripts/sync.sh)
npm run db:sync:pull    # remote → local
npm run db:sync:push    # local → remote

# Seed geographic data (countries, states, cities)
npm run seed:locations
```

### Writing queries

All database access goes through the DAL layer (`lib/data-access/*.dal.ts`). Use the server Supabase client for server-side code:

```typescript
// lib/data-access/events.dal.ts
import { createClient } from "@/lib/supabase/server";

export async function getEventById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, venue:venues(*), creator:users(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
```

---

## 8. Authentication & Roles

### How authentication works

1. **Registration** is invitation-only. An admin sends an invitation link with a token. The new user clicks the link and sets a password.
2. **Login** uses email + password via Supabase Auth. The session is stored in an httpOnly cookie.
3. The **middleware** (`middleware.ts`) runs on every request to refresh the session and enforce route protection.
4. Protected routes call `requireAuth()` on the server to get the current user.

### Role hierarchy

Roles are ordered from lowest to highest:

```
event_planner (1)
     ↓
city_curator (2) — same level as marketing_manager
marketing_manager (2)
     ↓
regional_curator (3)
     ↓
lead_curator (4)
     ↓
global_director (5)
```

### Auth helpers (server-side only)

All helpers live in `lib/auth/server.ts`:

```typescript
// Get current user — returns null if not authenticated
const user = await getServerUser();

// Require authentication — throws UnauthorizedError if not logged in
const user = await requireAuth();

// Require authentication and active status
const user = await requireActiveUser();

// Require specific role(s)
const user = await requireRole(["global_director", "lead_curator"]);

// Require minimum role level
const user = await requireMinimumRole("regional_curator");

// Non-throwing checks
const ok = await hasRole(["city_curator"]);
const ok = await hasMinimumRole("lead_curator");
```

### User status states

| Status     | Meaning                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| `pending`  | Registered but not yet activated by an admin. Can only access profile page. |
| `active`   | Full access based on role.                                                  |
| `inactive` | Deactivated. Cannot log in to any protected resource.                       |

---

## 9. External Integrations

### Supabase

Used for three things:

| Feature      | How                                                        |
| ------------ | ---------------------------------------------------------- |
| **Database** | PostgreSQL via `supabase-js` client                        |
| **Auth**     | Email/password sessions, cookie-based SSR                  |
| **Storage**  | File uploads (venue images, DJ files, event docs, avatars) |

Two clients exist:

- `lib/supabase/client.ts` — browser singleton, uses the anon key
- `lib/supabase/server.ts` — per-request server client, can use service role key

### Resend (Email)

All transactional emails go through Resend. The email service lives in `lib/services/email/`.

Email types sent:

- Invitation emails (new user registration links)
- Email verification OTPs
- Approval notifications (approve/reject/request modification)
- Report submission notifications
- DJ/venue contact verification links

In development, set `NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW=true` and visit `/dashboard/dev/email-templates` to preview and test all email templates without sending real emails.

### Cron Jobs

Event status transitions (e.g., moving an approved event to `completed_awaiting_report` after its date passes) are handled by a cron endpoint:

```
GET /api/cron/transition-events
Authorization: Bearer <CRON_SECRET>
```

Set this up in your hosting provider (Vercel Cron, GitHub Actions, or any external scheduler) to run on a schedule (e.g., every hour).

---

## 10. Available Scripts

```bash
npm run dev             # Start development server with hot reload
npm run build           # Build for production
npm run start           # Run production build locally
npm run lint            # Run ESLint
npm run format          # Run Prettier on all files
npm run test            # Run tests with Vitest
npm run test:watch      # Run tests in watch mode

# Database
npm run db:push         # Push schema.sql to Supabase
npm run db:pull         # Pull schema from Supabase
npm run db:reset        # Reset local database
npx supabase link --project-ref YOUR_PROJECT_REF   # Link CLI (one-time)
npm run db:sync:pull    # Sync remote data to local
npm run db:sync:push    # Sync local data to remote
npm run seed:locations  # Seed geographic location data
```

---

## 11. Development Workflow

### Adding a new feature

1. **Database first** — if the feature needs new tables or columns, write a migration in `db/migrations/` and update `db/schema.sql`.
2. **DAL** — add the query functions in `lib/data-access/`.
3. **Service** — add business logic in `lib/services/`.
4. **API route** — add the HTTP handler in `app/api/`.
5. **Client service** — add the `fetch()` wrapper in `lib/services/client/`.
6. **Hook** — add the React Query hook in `lib/hooks/`.
7. **Component** — build the UI in `components/`.
8. **Page** — wire up the page in `app/dashboard/`.

### Git hooks

Husky runs lint-staged on every commit, which automatically formats and lints staged files. Do not bypass this with `--no-verify`.

### Code style

- **TypeScript strict mode** is enabled — no implicit `any`.
- **Zod** is used for all runtime validation (API inputs, form inputs).
- **Error handling** — use `UnauthorizedError` and `ForbiddenError` from `lib/utils/errors` in API routes. The handlers catch and convert these to appropriate HTTP status codes.
- **Server vs client** — never import server-only code (Supabase server client, auth helpers) in client components. Next.js will error on this.

---

_See also: [Backend Guide](./BACKEND_GUIDE.md) · [Frontend Guide](./FRONTEND_GUIDE.md) · [Documentation index](./README.md)_

---

## 12. Frontend ↔ backend integration

End-to-end flow for typical dashboard features:

1. **Browser** — User action in a Client Component (e.g. submit form).
2. **Hook** — `useMutation` calls a function in `lib/services/client/*.client.service.ts`.
3. **HTTP** — `apiClient` sends `fetch` to `/api/...` with `credentials: "include"` (session cookies).
4. **Route handler** — `app/api/.../route.ts` runs `requireAuth()` / role checks, parses body with Zod, calls **services** → **DAL** → Supabase.
5. **Response** — JSON `{ success: true, data }` or error; React Query invalidates relevant keys so lists refetch.

Detailed UI-side steps: [Frontend Guide](./FRONTEND_GUIDE.md). Server-side steps: [Backend Guide](./BACKEND_GUIDE.md).
