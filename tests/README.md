# Testing Documentation

This project uses **Vitest** with **React Testing Library** for unit, integration, and component testing.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── utils/
│   └── test-helpers.tsx        # Helper functions and mock data
├── example.test.ts             # Example test file
└── README.md                   # This file
```

## Running Tests

```bash
# Run tests in watch mode (for development)
npm run test

# Run all tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- tests/example.test.ts
```

## Writing Tests

### Unit Tests (DAL & Services)

```typescript
// lib/data-access/__tests__/users.dal.test.ts
import { describe, it, expect, vi } from "vitest";
import * as usersDal from "../users.dal";
import { mockUsers, createMockSupabaseQuery } from "@/tests/utils/test-helpers";

describe("users.dal", () => {
  it("should find user by id", async () => {
    // Test implementation
  });
});
```

### Component Tests

```typescript
// components/users/__tests__/UserTable.test.tsx
import { describe, it, expect } from "vitest";
import { renderWithProviders, screen, mockUsers } from "@/tests/utils/test-helpers";
import { UserTable } from "../UserTable";

describe("UserTable", () => {
  it("should render users", () => {
    renderWithProviders(<UserTable users={[mockUsers.eventPlanner]} />);
    expect(screen.getByText("Event Planner")).toBeInTheDocument();
  });
});
```

## Mock Data

Test helpers provide mock data for:

- **Users** - All role levels (global_director, lead_curator, etc.)
- **Venues** - Sample venues with locations
- **Events** - Draft, in-review, approved events

```typescript
import { mockUsers, mockVenues, mockEvents } from "@/tests/utils/test-helpers";

// Use in your tests
const user = mockUsers.eventPlanner;
const venue = mockVenues.venue1;
const event = mockEvents.draft;
```

## Test Utilities

### `renderWithProviders()`

Renders React components with necessary providers (QueryClient, etc.):

```typescript
import { renderWithProviders } from "@/tests/utils/test-helpers";

renderWithProviders(<MyComponent />);
```

### `createMockSupabaseQuery()`

Creates a mock Supabase query builder:

```typescript
import { createMockSupabaseQuery } from "@/tests/utils/test-helpers";

const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
```

### `createTestQueryClient()`

Creates a fresh QueryClient for each test:

```typescript
import { createTestQueryClient } from "@/tests/utils/test-helpers";

const queryClient = createTestQueryClient();
```

## Testing Best Practices

1. **Arrange, Act, Assert** - Structure tests in three clear sections
2. **One assertion per test** - Keep tests focused
3. **Mock external dependencies** - Don't hit real APIs or database
4. **Use descriptive test names** - `it("should create user when valid data provided")`
5. **Test both success and error cases**
6. **Clean up after tests** - Automatic with `afterEach(cleanup)`

## Coverage Goals

- **DAL (Data Access Layer)**: 90%+ coverage
- **Services (Business Logic)**: 85%+ coverage
- **Server Actions**: 80%+ coverage
- **Components**: 70%+ coverage

## Mocked Modules

The following modules are automatically mocked in `tests/setup.ts`:

- `next/navigation` - Router, usePathname, useSearchParams
- `@/lib/supabase/client` - Client-side Supabase
- `@/lib/supabase/server` - Server-side Supabase

## Troubleshooting

### Tests timeout

Increase timeout in vitest.config.ts:

```typescript
test: {
  testTimeout: 10000,
}
```

### Module resolution issues

Check alias configuration in vitest.config.ts matches your tsconfig.json.

### Environment variables

Test environment variables are set in `tests/setup.ts`.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
