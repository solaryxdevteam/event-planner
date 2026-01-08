---
description: UI styling patterns using shadcn/ui components and Tailwind CSS for consistent, modern design system
alwaysApply: true
---

# UI & Styling Patterns

## Design System Foundation

### Technology Stack

- **Component Library:** shadcn/ui (built on Radix UI)
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **Notifications:** sonner (toast library)
- **Forms:** react-hook-form + shadcn/ui form components

### Installing shadcn/ui Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add form
```

## Color System

### Semantic Colors (Default shadcn/ui Theme)

```typescript
// Use semantic color classes from Tailwind + shadcn/ui

// Primary - Main brand color (blue)
"bg-primary text-primary-foreground"

// Secondary - Muted backgrounds
"bg-secondary text-secondary-foreground"

// Destructive - Errors, deletions (red)
"bg-destructive text-destructive-foreground"

// Muted - Subtle backgrounds
"bg-muted text-muted-foreground"

// Accent - Highlights
"bg-accent text-accent-foreground"

// Status colors
"bg-green-500 text-white" // Success
"bg-yellow-500 text-white" // Warning
"bg-red-500 text-white" // Error
"bg-blue-500 text-white" // Info
```

### Status Badge Colors

```typescript
// components/events/StatusBadge.tsx
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  draft: "bg-gray-500",
  in_review: "bg-blue-500",
  rejected: "bg-red-500",
  approved_scheduled: "bg-green-500",
  completed_awaiting_report: "bg-yellow-500",
  completed_archived: "bg-gray-400",
  cancelled: "bg-red-400",
} as const;

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge className={STATUS_COLORS[status]}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
```

## Typography

### Heading Hierarchy

```typescript
// Use Tailwind typography classes

<h1 className="text-4xl font-bold tracking-tight">Page Title</h1>
<h2 className="text-3xl font-semibold tracking-tight">Section Title</h2>
<h3 className="text-2xl font-semibold">Subsection Title</h3>
<h4 className="text-xl font-medium">Card Title</h4>
<p className="text-base">Body text</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<p className="text-xs text-muted-foreground">Caption text</p>
```

## Spacing System

### Use Tailwind's Default Scale

```typescript
// Spacing: 4px increments
p-0  // 0px
p-1  // 4px
p-2  // 8px
p-3  // 12px
p-4  // 16px
p-6  // 24px
p-8  // 32px
p-12 // 48px

// Common spacing patterns
"space-y-4"  // Vertical spacing between children
"space-x-4"  // Horizontal spacing between children
"gap-4"      // Gap in flex/grid
```

### Layout Spacing

```typescript
// Page container
<div className="container mx-auto px-4 py-8">

// Section spacing
<section className="space-y-6">

// Card padding
<Card className="p-6">
```

## Component Patterns

### Button Variants

```typescript
import { Button } from "@/components/ui/button";

// Primary action
<Button variant="default">Save</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Ghost (minimal)
<Button variant="ghost">View Details</Button>

// Outline
<Button variant="outline">Edit</Button>

// Link style
<Button variant="link">Learn More</Button>

// With icon
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Create Event
</Button>

// Loading state
<Button disabled={isLoading}>
  {isLoading ? "Creating..." : "Create Event"}
</Button>
```

### Card Layout

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Event Title</CardTitle>
    <CardDescription>Event description or metadata</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Form Pattern

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EventForm() {
  const form = useForm({
    resolver: zodResolver(createEventSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter event title" {...field} />
              </FormControl>
              <FormDescription>
                A clear, descriptive title for your event.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create Event"}
        </Button>
      </form>
    </Form>
  );
}
```

### Dialog Pattern

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Event</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event draft.
          </DialogDescription>
        </DialogHeader>
        
        {/* Form content */}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Table Pattern

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function EventsTable({ events }: { events: Event[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>{formatDate(event.event_date)}</TableCell>
              <TableCell>{event.venue?.name}</TableCell>
              <TableCell>
                <StatusBadge status={event.status} />
              </TableCell>
              <TableCell className="text-right">
                <EventActions event={event} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Dropdown Menu Pattern

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

export function EventActions({ event }: { event: Event }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleView}>View Details</DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Loading States

### Skeleton Loaders

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export function EventCardSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-20 w-full" />
    </Card>
  );
}

// Usage with Suspense
<Suspense fallback={<EventCardSkeleton />}>
  <EventCard eventId={id} />
</Suspense>
```

### Loading Spinner

```typescript
import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

## Feedback & Notifications

### Toast Notifications

```typescript
"use client";

import { toast } from "sonner";

// Success
toast.success("Event created successfully");

// Error
toast.error("Failed to create event");

// Info
toast.info("Your draft has been auto-saved");

// Warning
toast.warning("Event date is approaching");

// With action
toast.success("Event created", {
  action: {
    label: "View",
    onClick: () => router.push(`/events/${eventId}`),
  },
});

// With duration
toast.success("Saved", { duration: 2000 });
```

### Empty States

```typescript
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

## Responsive Design

### Desktop-First Approach (MVP Focus)

```typescript
// Optimize for desktop (1280px - 1920px)
// Basic mobile support (320px - 768px)

// Container widths
<div className="container max-w-7xl mx-auto px-4">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive flex
<div className="flex flex-col md:flex-row gap-4">

// Hide on mobile
<div className="hidden md:block">Sidebar</div>

// Show only on mobile
<div className="md:hidden">Mobile Menu</div>
```

## Accessibility Considerations

### Focus Indicators

```typescript
// Ensure visible focus rings (default in shadcn/ui)
<Button className="focus-visible:ring-2 focus-visible:ring-ring">
  Click me
</Button>
```

### ARIA Labels

```typescript
// Icon-only buttons
<Button variant="ghost" size="icon" aria-label="Delete event">
  <Trash2 className="h-4 w-4" />
</Button>

// Status badges
<Badge aria-label={`Status: ${status}`}>
  {status}
</Badge>
```

## Icons

### Using lucide-react

```typescript
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

<Button>
  <Plus className="mr-2 h-4 w-4" />
  Create Event
</Button>
```

## Best Practices

✅ **Do:**
- Use shadcn/ui components consistently
- Follow semantic color naming (primary, destructive, muted)
- Use Tailwind's spacing scale (4px increments)
- Add loading states to all async operations
- Show toast notifications for user actions
- Use skeleton loaders for content loading
- Provide empty states with clear actions
- Use semantic HTML (button, nav, header, etc.)
- Add aria-labels to icon-only buttons
- Test desktop layouts at 1280px and 1920px

❌ **Don't:**
- Modify shadcn/ui component files directly (create wrappers)
- Use arbitrary spacing values (use Tailwind scale)
- Skip loading indicators
- Forget error states
- Use generic error messages ("Error occurred")
- Nest shadcn/ui components incorrectly
- Use `any` types with shadcn/ui components
- Forget to import lucide-react icons

