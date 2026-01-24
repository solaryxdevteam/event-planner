# API Migration Summary

## Overview

This document summarizes the migration from Server Actions to API Routes with React Query for all client-side database operations.

## Architecture Change

### Before (Server Actions)

```
Client Component
    ↓ direct call
Server Action (lib/actions/*.ts)
    ↓ calls
Service Layer
    ↓ calls
DAL Layer
    ↓ queries
Database
```

### After (API Routes)

```
Client Component
    ↓ fetch()
API Route (/app/api/*/route.ts)
    ↓ calls
Service Layer (lib/services/*/*.service.ts)
    ↓ calls
DAL Layer (lib/data-access/*.dal.ts)
    ↓ queries
Database
```

## Completed Work

### 1. API Routes Created

#### Venues API

- ✅ `GET /api/venues` - Get venues with filters and pagination
- ✅ `POST /api/venues` - Create a new venue
- ✅ `GET /api/venues/[id]` - Get a single venue by ID
- ✅ `PUT /api/venues/[id]` - Update a venue
- ✅ `DELETE /api/venues/[id]` - Delete (soft delete) a venue
- ✅ `POST /api/venues/[id]/ban` - Ban a venue (Global Director only)
- ✅ `POST /api/venues/[id]/unban` - Unban a venue (Global Director only)
- ✅ `GET /api/venues/short-id/[shortId]` - Get venue by short ID

#### Users API

- ✅ `GET /api/users` - Get paginated users with search and filters (Global Director only)
- ✅ `POST /api/users` - Create a new user directly (Global Director only)
- ✅ `PUT /api/users/[id]` - Update a user (Global Director only)
- ✅ `DELETE /api/users/[id]` - Deactivate a user (Global Director only)
- ✅ `POST /api/users/[id]/activate` - Activate a pending user (Global Director only)
- ✅ `GET /api/users/potential-parents` - Get potential parents for a role
- ✅ `GET /api/users/profile` - Get current user's profile
- ✅ `PUT /api/users/profile` - Update current user's profile
- ✅ `GET /api/users/hierarchy` - Get user hierarchy tree (already existed)

#### Locations API

- ✅ `GET /api/locations` - Get locations (countries, states, cities, by ID, default country)

#### Invitations API

- ✅ `POST /api/invitations` - Create an invitation (Global Director only)
- ✅ `GET /api/invitations/validate` - Validate an invitation token

### 2. React Query Hooks Created

- ✅ `lib/hooks/use-venues.ts` - Venues queries and mutations
- ✅ `lib/hooks/use-users.ts` - Users queries and mutations
- ✅ `lib/hooks/use-profile.ts` - User profile queries and mutations
- ✅ `lib/hooks/use-locations-api.ts` - Locations queries
- ✅ `lib/hooks/use-invitations.ts` - Invitations queries and mutations
- ✅ `lib/hooks/use-user-hierarchy.ts` - User hierarchy query

### 3. Components Updated

- ✅ `app/dashboard/venues/page.tsx` - Migrated to use React Query hooks

### 4. Documentation Updated

- ✅ `.cursor/rules/frontend-patterns/RULE.md` - Updated with API route pattern and React Query usage guidelines

## Remaining Work

### Components That Still Need Migration

The following components still use server actions and need to be migrated to use React Query hooks:

#### Venues Components

- [ ] `components/venues/VenueSelect.tsx` - Uses `getVenues` server action
- [ ] `components/venues/VenueForm.tsx` - Uses `createVenue`, `updateVenue` server actions
- [ ] `components/venues/DeleteVenueDialog.tsx` - Uses `deleteVenue` server action
- [ ] `components/venues/BanVenueDialog.tsx` - Uses `banVenue` server action
- [ ] `components/venues/UnbanVenueDialog.tsx` - Uses `unbanVenue` server action
- [ ] `app/dashboard/venues/[id]/edit/page.tsx` - Uses `getVenueByShortId`, `deleteVenue`, `banVenue`, `unbanVenue` server actions
- [ ] `app/dashboard/venues/new/page.tsx` - Uses `getCurrentUserProfile`, `getLocationById` server actions

#### Users Components

- [ ] `components/users/UserManagementClient.tsx` - Uses `getUsersPaginated` server action
- [ ] `components/users/UserFormDialog.tsx` - Uses `createUserDirectly`, `updateUser`, `checkGlobalDirectorPassword`, `getPotentialParents` server actions
- [ ] `components/users/ActivateUserDialog.tsx` - Uses `activateUser`, `getPotentialParents` server actions
- [ ] `components/users/DeactivateUserDialog.tsx` - Uses `deactivateUser` server action
- [ ] `components/users/CreateInvitationDialog.tsx` - Uses `createInvitation` server action

#### Profile Components

- [ ] `components/profile/ProfileForm.tsx` - Uses `updateProfile` server action
- [ ] `components/profile/AvatarUpload.tsx` - Uses `uploadAvatar`, `removeAvatar`, `getCurrentUserProfile` server actions
- [ ] `app/dashboard/profile/page.tsx` - Uses `getCurrentUserProfile` server action

#### Locations Components

- [ ] `lib/hooks/use-locations.ts` - Uses location server actions (needs to be migrated to use API)

#### Auth Components

- [ ] `app/auth/register/[token]/page.tsx` - Uses `registerWithInvitation`, `validateInvitationToken`, `getLocationById`, `getStatesByCountry` server actions

### Additional API Routes Needed

- [ ] `POST /api/users/profile/avatar` - Upload avatar
- [ ] `DELETE /api/users/profile/avatar` - Remove avatar
- [ ] `POST /api/auth/register` - Register with invitation token
- [ ] `POST /api/users/[id]/check-password` - Check Global Director password (if needed)

## Best Practices Implemented

1. **Consistent Response Format**: All API routes return `{ success: boolean, data?: T, error?: string }`
2. **Proper Error Handling**: Using HTTP status codes (401, 403, 404, 500) with custom error classes
3. **React Query Caching**: Automatic caching with appropriate `staleTime` values
4. **Query Invalidation**: Mutations automatically invalidate related queries
5. **Type Safety**: Full TypeScript support with shared types
6. **Enum Usage**: Using `UserRole` enum consistently throughout API routes

## Migration Checklist for Remaining Components

For each component that needs migration:

1. ✅ Identify which server actions are being used
2. ✅ Check if corresponding API route exists (create if needed)
3. ✅ Check if React Query hook exists (create if needed)
4. ✅ Replace server action calls with React Query hooks
5. ✅ Remove server action imports
6. ✅ Update error handling to use React Query error states
7. ✅ Update loading states to use React Query loading states
8. ✅ Test the component

## Notes

- Server actions in `lib/actions/*.ts` are still available for Server Components (pages that don't use "use client")
- API routes should be used for all Client Components
- React Query provides automatic caching, refetching, and error handling
- All API routes require authentication via `requireAuth()` or `requireRole()`
- Enums (like `UserRole`) should be used consistently instead of string literals
