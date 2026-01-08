# Cursor Rules for Event Management Platform

This directory contains project-specific rules that guide AI-assisted development for the hierarchical event management platform.

## 📋 Rules Overview

### 1. **backend-architecture** (Always Applied)
Enforces 3-layer backend architecture pattern:
- **Data Access Layer (DAL)**: Pure database operations in `/lib/data-access/*.dal.ts`
- **Service Layer**: Business logic in `/lib/services/*/*.service.ts`
- **Entry Points**: Server Actions (`/lib/actions/*.ts`) and Route Handlers (`/app/api/*/route.ts`)

**Key Patterns:**
- Server Actions for form submissions and mutations
- Route Handlers only for webhooks and public APIs
- Consistent `ActionResponse<T>` format
- Clear separation of concerns

### 2. **typescript-patterns** (Always Applied)
TypeScript conventions for type safety and consistency:
- **Enums**: Centralized in `/lib/types/enums.ts` for all fixed value sets
- **Naming**: UPPER_SNAKE_CASE for enum keys, lowercase_snake_case for values
- **Database Sync**: TypeScript enums match PostgreSQL enum types
- **Helper Functions**: `isValidEnumValue()`, `enumToArray()`, `enumToOptions()`

**Key Patterns:**
- Never use string literals for status values
- Always import and use enums
- Validate enum values at runtime
- Generate dropdown options from enums

### 3. **frontend-patterns** (Always Applied)
Frontend architecture using Next.js App Router:
- **Server Components by default** (no "use client" unless needed)
- **Client Components** only for interactivity (forms, hooks, browser APIs)
- **State Management**: TanStack Query for server state, useState/Context for UI state
- **Form Handling**: react-hook-form + Zod validation

**Key Patterns:**
- Push "use client" boundary as deep as possible
- Use Suspense for loading states
- Optimistic updates with TanStack Query
- Progressive enhancement

### 4. **database-patterns** (Always Applied)
Database schema and Supabase integration patterns:
- **PostgreSQL** via Supabase with Row Level Security (RLS)
- **Pyramid Visibility**: Users see own data + subordinates' data
- **Soft Deletes**: Use `is_active` boolean
- **Audit Trail**: Log all state changes
- **Type Safety**: Generated types from database schema

**Key Patterns:**
- Hierarchical data with self-referencing foreign keys
- Recursive CTE functions for subordinate queries
- RLS policies for data access control
- Automatic timestamps and audit logging

### 5. **validation-patterns** (Always Applied)
Input validation using Zod schemas:
- **One schema file per domain** in `/lib/validation/`
- **Naming Convention**: `createXSchema`, `updateXSchema`, `approveXSchema`
- **Type Inference**: Export TypeScript types from schemas
- **Validation Points**: Server Actions, Route Handlers, Client Forms

**Key Patterns:**
- Validate all inputs at entry points
- Use `.parse()` in Server Actions (throws on error)
- Custom error messages for user-friendly feedback
- Conditional validation with `.refine()`

### 6. **permissions-authorization** (Always Applied)
Authorization patterns for hierarchical permissions:
- **Pyramid Visibility**: Users see data from self + subordinates
- **Role Hierarchy**: Event Planner → City Curator → Regional Curator → Lead Curator → Global Director
- **Permission Guards**: Throw errors if unauthorized
- **Service Layer Checks**: Always validate permissions before operations

**Key Patterns:**
- Check permissions in Service Layer (not DAL)
- Use `getVisibleUserIds()` for pyramid filtering
- Role-based operations (Global Director privileges)
- Frontend permission checks for conditional rendering

### 7. **ui-styling-patterns** (Always Applied)
UI design system using shadcn/ui and Tailwind CSS:
- **Component Library**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with semantic color system
- **Icons**: lucide-react
- **Notifications**: sonner (toast library)

**Key Patterns:**
- Use shadcn/ui components consistently
- Follow Tailwind spacing scale (4px increments)
- Desktop-first responsive design (MVP focus)
- Loading states with skeletons
- Empty states with clear actions

### 8. **error-handling** (Always Applied)
Error handling and utilities:
- **Custom Error Classes**: `AppError`, `ValidationError`, `PermissionError`, etc.
- **Consistent Error Handling**: Try-catch in all Server Actions
- **User-Friendly Messages**: Sanitize errors before showing to users
- **Error Boundary**: React Error Boundary for client-side errors

**Key Patterns:**
- Throw custom errors in Service Layer
- Handle Zod errors separately
- Return `ActionResponse<T>` format
- Log errors with context
- Use toast notifications for feedback

## AI Interaction Guidelines

### When to Ask for Clarification
The AI should **always ask** before:
- Making architectural decisions or adding new dependencies
- Modifying database schemas or migrations
- Changing authentication/authorization logic
- Altering core business rules or workflows
- Breaking existing APIs or contracts
- Removing or significantly refactoring existing features

### When to Proceed with Reasonable Defaults
The AI can proceed without asking for:
- Code formatting and style choices (follow existing patterns)
- Variable/function naming (use conventions from this codebase)
- Adding error handling or validation (always expected)
- Writing tests (always encouraged)
- Implementing obvious fixes for bugs or linter errors

### General Principle
**Ask for user input when the decision is ambiguous or consequential. Use best judgment and established patterns for routine implementation details.**


## 🚀 How These Rules Work

When you use Cursor AI (Chat or Agent), these rules are automatically included in the context to guide code generation and suggestions. The AI will:

1. **Follow architectural patterns** defined in these rules
2. **Generate code** that matches the established conventions
3. **Suggest improvements** aligned with best practices
4. **Maintain consistency** across the codebase

## 📁 File Structure Reference

```
/app
  /api                          # Route Handlers (webhooks, exports)
  /(auth)                       # Auth routes
  /(dashboard)                  # Protected routes

/lib
  /actions                      # Server Actions
  /services                     # Business Logic
  /data-access                  # Database Queries
  /validation                   # Zod Schemas
  /permissions                  # Authorization
  /auth                         # Auth utilities
  /supabase                     # Supabase clients
  /types                        # TypeScript types
  /utils                        # Utilities

/components
  /ui                           # shadcn/ui components
  /[domain]                     # Feature components
  /shared                       # Shared components

/db
  /migrations                   # Database migrations
  /functions                    # PostgreSQL functions
  /triggers                     # Database triggers
  /policies                     # RLS policies
```

## 🎯 Quick Reference

### Creating a New Feature

1. **Database**: Create migration in `/db/migrations/`
2. **DAL**: Create data access layer in `/lib/data-access/[table].dal.ts`
3. **Service**: Create service in `/lib/services/[domain]/[feature].service.ts`
4. **Validation**: Create schema in `/lib/validation/[domain].schema.ts`
5. **Actions**: Create server actions in `/lib/actions/[domain].ts`
6. **Components**: Create UI components in `/components/[domain]/`
7. **Pages**: Create routes in `/app/(dashboard)/[route]/page.tsx`

### Common Patterns

**Server Action:**
```typescript
"use server";
export async function myAction(data: unknown): Promise<ActionResponse<T>> {
  try {
    const user = await getServerUser();
    const validated = mySchema.parse(data);
    const result = await myService.doSomething(user.id, validated);
    return { success: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}
```

**Service Function:**
```typescript
export async function doSomething(userId: string, data: Input): Promise<Output> {
  await requireCanDoSomething(userId);
  const result = await myDAL.insert(data);
  await auditService.log({ user_id: userId, action_type: "do_something" });
  return result;
}
```

**Client Component:**
```typescript
"use client";
export function MyForm() {
  const form = useForm({ resolver: zodResolver(mySchema) });
  
  async function onSubmit(data) {
    const result = await myAction(data);
    if (result.success) toast.success("Success!");
    else toast.error(result.error);
  }
  
  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

## 📚 Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Zod Documentation](https://zod.dev/)
- [TanStack Query](https://tanstack.com/query/latest)

## 🔄 Updating Rules

To modify or add rules:

1. Edit existing `RULE.md` files in their respective folders
2. Create new rule folders with `RULE.md` files
3. Update frontmatter metadata:
   - `description`: Brief description of the rule
   - `alwaysApply`: Set to `true` for rules that should always be included
   - `globs`: (optional) Apply to specific file patterns

## ✅ Rule Status

All rules are set to **`alwaysApply: true`** to ensure consistent guidance across the entire codebase during MVP development.

---

**Last Updated:** January 8, 2026
**Project:** Hierarchical Event Management Platform
**Sprint:** Sprint 1 - Foundation & Core Infrastructure

