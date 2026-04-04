# Frontend Guide — Shiraz House Event Planner

How the UI is structured, how data reaches the screen, and how to add features that work cleanly with the Next.js API routes and Supabase backend.

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Tech in the UI Layer](#2-tech-in-the-ui-layer)
3. [Project Conventions](#3-project-conventions)
4. [Routing & Layouts](#4-routing--layouts)
5. [Server vs Client Components](#5-server-vs-client-components)
6. [Data Fetching: The Standard Path](#6-data-fetching-the-standard-path)
7. [Forms & Validation](#7-forms--validation)
8. [Authentication on the Client](#8-authentication-on-the-client)
9. [Styling & Components](#9-styling--components)
10. [Adding a Frontend Feature (End-to-End)](#10-adding-a-frontend-feature-end-to-end)
11. [Debugging Tips](#11-debugging-tips)

---

## 1. Mental Model

- **There is no separate frontend repo.** The UI is Next.js (App Router) in `app/`, and “the backend” is **Route Handlers** under `app/api/*/route.ts` plus shared libraries in `lib/`.
- **Default data path for dashboard features:**  
  **React component → hook (`lib/hooks/`) → client service (`lib/services/client/`) → `fetch` to `/api/...` → service → DAL → Supabase.**  
  Cookies carry the Supabase session; `apiClient` uses `credentials: "include"` so API routes see the same user as the browser.
- **Direct Supabase from the browser** (`lib/supabase/client.ts`) is reserved for **auth session** and cases where you intentionally talk to Supabase from the client. Prefer API routes for domain data so authorization and validation stay on the server.

---

## 2. Tech in the UI Layer

| Concern             | Choice                         | Where                                                   |
| ------------------- | ------------------------------ | ------------------------------------------------------- |
| Framework           | Next.js 16 App Router          | `app/`                                                  |
| UI primitives       | shadcn/ui (Radix)              | `components/ui/`                                        |
| Styling             | Tailwind CSS v4                | `app/globals.css`, class names                          |
| Server/client cache | TanStack React Query           | `lib/hooks/`, `components/providers/query-provider.tsx` |
| Toasts              | Sonner                         | `sonner`, used in hooks and pages                       |
| Forms               | React Hook Form + Zod resolver | Feature forms under `components/`                       |
| Client-only maps    | Leaflet / react-leaflet        | Venue/map features                                      |

---

## 3. Project Conventions

- **Imports:** Use the `@/` alias (see `tsconfig.json`) — e.g. `@/components/...`, `@/lib/...`.
- **Feature folders:** Group by domain under `components/` (`events/`, `venues/`, `users/`, etc.).
- **Do not edit** `components/ui/` by hand except through shadcn conventions; extend via composition in feature components.
- **Hooks** live in `lib/hooks/` (not `hooks/` at repo root — `components.json` may mention `@/hooks`; the codebase uses `@/lib/hooks`).

---

## 4. Routing & Layouts

- **Routes** map to folders in `app/`. Dynamic segments use `[param]`.
- **Dashboard** lives under `app/dashboard/`; middleware protects these routes (see `middleware.ts`).
- **Public auth** under `app/auth/` (login, register, verify-email, etc.).
- **Root layout** (`app/layout.tsx`) wraps the app with `QueryProvider`, `ThemeProvider`, and `Toaster`.

For URL search-param state, some screens may use `nuqs` — follow existing patterns in the feature you are changing.

---

## 5. Server vs Client Components

- Files **without** `"use client"` are **Server Components** by default. They can call server-only modules (`@/lib/supabase/server`, `@/lib/auth/server`) and should be used for **initial data** when you want to avoid a client round-trip — as long as you do not need browser-only APIs.
- Add **`"use client"`** at the top when you use hooks (`useState`, `useQuery`, etc.), event handlers, or browser APIs.

**Rule:** Never import `lib/supabase/server.ts` or `lib/auth/server.ts` into a Client Component.

---

## 6. Data Fetching: The Standard Path

### 6.1 API client

`lib/services/client/api-client.ts` exports `apiClient`, a thin wrapper around `fetch` that:

- Sends JSON and reads `{ success, data, error, details }`
- Uses **`credentials: "include"`** so session cookies are sent
- Throws **`ApiError`** on failure (check `status` and `details`)

### 6.2 Client services

Per-domain functions (e.g. `lib/services/client/events.client.service.ts`) call `apiClient.get/post/put/patch/delete` with paths under `/api/...`. They map UI-friendly arguments to query params or JSON bodies.

### 6.3 React Query hooks

`lib/hooks/use-*.ts` files wrap client services with `useQuery` / `useMutation`:

- **`queryKey`** — namespace data (e.g. `["events", filters]`). Invalidate related keys after mutations.
- **`enabled`** — skip fetching until required ids exist (e.g. `enabled: !!id`).
- **`staleTime` / `gcTime`** — defaults are set in `QueryProvider`; override per hook if needed.

Example pattern (simplified):

```typescript
// lib/hooks/use-events.ts
export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => eventsClientService.fetchEvents(filters),
  });
}
```

### 6.4 Using hooks in components

```typescript
"use client";

import { useEvents } from "@/lib/hooks/use-events";

export function EventList() {
  const { data, isLoading, error } = useEvents({ page: 1 });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <ul>{data?.events.map(...)}</ul>;
}
```

---

## 7. Forms & Validation

- **Zod schemas** live in `lib/validation/*.schema.ts` and are shared with API routes.
- **React Hook Form** with `zodResolver` keeps client validation aligned with server validation.
- On submit, call a **mutation hook** that uses a client service → API route; show errors from `ApiError` or field-level validation.

---

## 8. Authentication on the Client

- **Sign in / sign out:** `lib/auth/client.ts` (`signInWithPassword`, `signOut`, etc.) uses `createClient()` from `lib/supabase/client.ts`.
- **Session refresh** happens in `middleware.ts`; you normally do not manually refresh in every component.
- **Role and permission checks** for sensitive UI should **mirror** server rules (hide buttons) but **always** rely on the API returning `401`/`403` for real enforcement.

---

## 9. Styling & Components

- Use **Tailwind** utility classes; design tokens live in CSS variables (see `app/globals.css` and shadcn theme).
- **Icons:** `lucide-react`.
- **Charts:** Chart.js via `react-chartjs-2` where dashboards require charts.
- **Motion:** `framer-motion` / `motion` for animations — use sparingly and consistently with nearby screens.

---

## 10. Adding a Frontend Feature (End-to-End)

Work in this order so types and contracts stay aligned:

1. **Backend contract** — Ensure the API route exists under `app/api/` and returns `{ success: true, data: ... }` (see [Backend Guide](./BACKEND_GUIDE.md)).
2. **Client service** — Add functions in `lib/services/client/<domain>.client.service.ts` using `apiClient`.
3. **Hook** — Add `useQuery` / `useMutation` in `lib/hooks/use-<domain>.ts` with appropriate `queryKey`s and invalidation.
4. **UI** — Build components under `components/<domain>/` and a page under `app/dashboard/...` if needed.
5. **Validation** — Reuse or extend Zod schemas in `lib/validation/` for forms that post to the new endpoint.

**Full-stack checklist** (also in [Developer Guide](./DEVELOPER_GUIDE.md)):

| Step               | Layer                                              |
| ------------------ | -------------------------------------------------- |
| Schema / migration | `db/`, apply to Supabase                           |
| Types              | `lib/types/database.types.ts` (or generated types) |
| DAL                | `lib/data-access/*.dal.ts`                         |
| Service            | `lib/services/**`                                  |
| API                | `app/api/**/route.ts`                              |
| Client service     | `lib/services/client/`                             |
| Hook               | `lib/hooks/`                                       |
| UI                 | `components/`, `app/`                              |

---

## 11. Debugging Tips

- **401/403 on API calls** — Confirm you are logged in, user `status` is `active`, and role matches the route’s `requireAuth` / `requireRole` expectations.
- **CORS is usually not the issue** — Same-origin `/api` routes use cookies; check Network tab for cookie inclusion and response JSON.
- **Stale UI after mutation** — Invalidate the right `queryKey`s in `onSuccess` (see existing hooks).
- **Env errors in browser** — Only `NEXT_PUBLIC_*` variables exist client-side; server-only secrets must be read in Route Handlers or Server Components.

---

_See also: [Developer Guide](./DEVELOPER_GUIDE.md) · [Backend Guide](./BACKEND_GUIDE.md) · [Documentation index](./README.md)_
