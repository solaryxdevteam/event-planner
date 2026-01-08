---
description: Frontend architecture patterns for Next.js App Router with Server Components, Client Components, and form handling
alwaysApply: true
---

# Frontend Architecture Patterns

## Server Components by Default

**Rule:** All components are Server Components unless they need client-side interactivity.

### When to Use Server Components (No "use client")

✅ **Use for:**
- Page layouts and routes (`/app/**page.tsx`)
- Data fetching components
- Static content display
- Layouts and templates
- Components that don't need interactivity

**Benefits:**
- Zero JavaScript sent to client
- Direct database access via Server Actions
- Better performance
- SEO-friendly

**Example:**
```typescript
// app/events/current/page.tsx
import { getServerUser } from "@/lib/auth/server";
import { getCurrentEvents } from "@/lib/actions/events";
import { EventList } from "@/components/events/EventList";

export default async function CurrentEventsPage() {
  const user = await getServerUser();
  const result = await getCurrentEvents();

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <div>
      <h1>Current Events</h1>
      <EventList events={result.data} />
    </div>
  );
}
```

### When to Use Client Components ("use client")

✅ **Use for:**
- Event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, useContext, etc.)
- Browser APIs (localStorage, window, document)
- Third-party libraries requiring client-side code
- Animations and transitions
- Form components with real-time validation
- Interactive UI elements (dropdowns, modals, tooltips)

**Rules:**
- Add `"use client"` directive at the top of file
- Keep Client Components small and focused
- Push "use client" boundary as deep as possible
- Pass server-fetched data as props

**Example:**
```typescript
// components/events/EventFormDialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventDraft } from "@/lib/actions/events";
import { createEventSchema } from "@/lib/validation/events.schema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EventFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(createEventSchema),
  });

  async function onSubmit(data) {
    const result = await createEventDraft(data);
    
    if (result.success) {
      toast.success("Draft created successfully");
      setIsOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Form content */}
    </Dialog>
  );
}
```

## Component Organization

### UI Components (`/components/ui/*`)

**Purpose:** Reusable UI primitives from shadcn/ui.

**Rules:**
- Generated via `npx shadcn-ui@latest add [component]`
- Don't modify these files directly
- Create wrapper components if customization needed
- All shadcn/ui components live here

### Feature Components (`/components/[domain]/*`)

**Purpose:** Domain-specific components.

**Organization:**
```
/components
  /events
    EventCard.tsx         # Display component (can be Server)
    EventTable.tsx        # Display component (can be Server)
    EventFormDialog.tsx   # Interactive form (must be Client)
    EventFilters.tsx      # Interactive filters (must be Client)
  /users
    UserTable.tsx
    UserFormDialog.tsx
  /approvals
    ApprovalCard.tsx
    ApprovalDialog.tsx
```

### Shared Components (`/components/shared/*`)

**Purpose:** Cross-domain reusable components.

**Examples:**
- `LoadingSpinner.tsx`
- `ErrorBoundary.tsx`
- `ConfirmDialog.tsx`
- `PageHeader.tsx`
- `EmptyState.tsx`

## Form Handling Patterns

### Pattern 1: Server Actions with Progressive Enhancement

**Best for:** Simple forms, SEO-critical forms.

```typescript
// app/login/page.tsx - Server Component
export default function LoginPage() {
  return (
    <form action={signInWithMagicLink}>
      <input type="email" name="email" required />
      <button type="submit">Send Magic Link</button>
    </form>
  );
}
```

### Pattern 2: Client Component with react-hook-form

**Best for:** Complex forms, real-time validation, multi-step forms.

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventDraft } from "@/lib/actions/events";
import { createEventSchema } from "@/lib/validation/events.schema";

export function EventForm() {
  const form = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  async function onSubmit(data) {
    const result = await createEventDraft(data);
    
    if (result.success) {
      // Handle success
    } else {
      form.setError("root", { message: result.error });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Pattern 3: Optimistic Updates with TanStack Query

**Best for:** Mutations with immediate feedback.

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveEvent } from "@/lib/actions/approvals";
import { toast } from "sonner";

export function ApprovalCard({ event }) {
  const queryClient = useQueryClient();
  
  const approveMutation = useMutation({
    mutationFn: (eventId: string) => approveEvent(eventId, "Approved"),
    onMutate: async (eventId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["approvals"] });
      const previous = queryClient.getQueryData(["approvals"]);
      
      queryClient.setQueryData(["approvals"], (old) =>
        old.filter((item) => item.id !== eventId)
      );
      
      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["approvals"], context.previous);
      toast.error("Approval failed");
    },
    onSuccess: () => {
      toast.success("Event approved successfully");
    },
  });

  return (
    <div>
      <h3>{event.title}</h3>
      <button onClick={() => approveMutation.mutate(event.id)}>
        Approve
      </button>
    </div>
  );
}
```

## State Management

### Server State (TanStack Query)

**Use for:** Data fetched from server (events, users, approvals).

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { getPendingEventApprovals } from "@/lib/actions/approvals";

export function ApprovalsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: async () => {
      const result = await getPendingEventApprovals();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* Render approvals */}</div>;
}
```

### UI State (useState, Context)

**Use for:** Local UI state (modal open/closed, form values, filters).

```typescript
"use client";

import { useState } from "react";

export function EventFilters() {
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "upcoming",
  });

  return (
    <div>
      <Select
        value={filters.status}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, status: value }))
        }
      >
        {/* Options */}
      </Select>
    </div>
  );
}
```

### Global State (React Context)

**Use for:** Auth state, theme, user preferences.

```typescript
// lib/auth/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Subscribe to auth changes
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

## Loading & Error States

### Loading States

**Use Suspense for Server Components:**
```typescript
// app/events/page.tsx
import { Suspense } from "react";
import { EventList } from "@/components/events/EventList";
import { EventListSkeleton } from "@/components/events/EventListSkeleton";

export default function EventsPage() {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <EventList />
    </Suspense>
  );
}
```

**Use loading states for Client Components:**
```typescript
"use client";

export function EventForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data) {
    setIsLoading(true);
    try {
      await createEventDraft(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button disabled={isLoading}>
      {isLoading ? "Creating..." : "Create Event"}
    </Button>
  );
}
```

### Error Handling

**Error Boundaries for Client Components:**
```typescript
// components/shared/ErrorBoundary.tsx
"use client";

import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Routing & Navigation

### Server-side Navigation
```typescript
import { redirect } from "next/navigation";

export default async function EventPage({ params }) {
  const user = await getServerUser();
  
  if (!user) {
    redirect("/login");
  }
  
  // Render page
}
```

### Client-side Navigation
```typescript
"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  
  return (
    <button onClick={() => router.back()}>
      Back
    </button>
  );
}
```

## Best Practices

✅ **Do:**
- Default to Server Components
- Push "use client" boundary down
- Use Server Actions for mutations
- Use TanStack Query for server state
- Use Suspense for loading states
- Handle errors gracefully
- Show loading indicators
- Provide user feedback (toasts)

❌ **Don't:**
- Add "use client" to entire page files
- Fetch data in Client Components (use Server Components)
- Use useEffect for data fetching (use TanStack Query)
- Forget error handling
- Ignore loading states
- Skip input validation

