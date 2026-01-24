/**
 * Test Helper Utilities
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

/**
 * Create a new QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { queryClient = createTestQueryClient(), ...renderOptions }: RenderOptions & { queryClient?: QueryClient } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Mock user data for testing
 */
export const mockUsers = {
  globalDirector: {
    id: "global-director-id",
    email: "director@example.com",
    name: "Global Director",
    role: "global_director" as const,
    parent_id: null,
    city: "HQ",
    region: "Global",
    is_active: true,
    avatar_url: null,
    notification_prefs: { email: true, frequency: "instant" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  leadCurator: {
    id: "lead-curator-id",
    email: "lead@example.com",
    name: "Lead Curator",
    role: "lead_curator" as const,
    parent_id: "global-director-id",
    city: "NYC",
    region: "Americas",
    is_active: true,
    avatar_url: null,
    notification_prefs: { email: true, frequency: "instant" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  regionalCurator: {
    id: "regional-curator-id",
    email: "regional@example.com",
    name: "Regional Curator",
    role: "regional_curator" as const,
    parent_id: "lead-curator-id",
    city: "NYC",
    region: "Northeast",
    is_active: true,
    avatar_url: null,
    notification_prefs: { email: true, frequency: "daily" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  cityCurator: {
    id: "city-curator-id",
    email: "city@example.com",
    name: "City Curator",
    role: "city_curator" as const,
    parent_id: "regional-curator-id",
    city: "Boston",
    region: "Northeast",
    is_active: true,
    avatar_url: null,
    notification_prefs: { email: true, frequency: "instant" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  eventPlanner: {
    id: "event-planner-id",
    email: "planner@example.com",
    name: "Event Planner",
    role: "event_planner" as const,
    parent_id: "city-curator-id",
    city: "Boston",
    region: "Northeast",
    is_active: true,
    avatar_url: null,
    notification_prefs: { email: true, frequency: "instant" },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

/**
 * Mock venue data for testing
 */
export const mockVenues = {
  venue1: {
    id: "venue-1-id",
    name: "Conference Center",
    address: "123 Main St",
    city: "Boston",
    country: "USA",
    region: "Northeast",
    location: { lat: 42.3601, lng: -71.0589 },
    capacity: 500,
    notes: "Large conference center",
    creator_id: "event-planner-id",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  venue2: {
    id: "venue-2-id",
    name: "Community Hall",
    address: "456 Oak Ave",
    city: "Boston",
    country: "USA",
    region: "Northeast",
    location: { lat: 42.3584, lng: -71.0598 },
    capacity: 100,
    notes: "Small community space",
    creator_id: "event-planner-id",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

/**
 * Mock event data for testing
 */
export const mockEvents = {
  draft: {
    id: "event-draft-id",
    title: "Draft Event",
    description: "This is a draft event",
    event_date: "2024-12-01",
    event_time: "18:00:00",
    venue_id: "venue-1-id",
    creator_id: "event-planner-id",
    status: "draft" as const,
    expected_attendance: 100,
    budget: 5000,
    notes: "Draft notes",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  inReview: {
    id: "event-review-id",
    title: "Event In Review",
    description: "This event is in review",
    event_date: "2024-12-15",
    event_time: "19:00:00",
    venue_id: "venue-1-id",
    creator_id: "event-planner-id",
    status: "in_review" as const,
    expected_attendance: 200,
    budget: 10000,
    notes: "Review notes",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
  approved: {
    id: "event-approved-id",
    title: "Approved Event",
    description: "This event is approved",
    event_date: "2024-12-20",
    event_time: "20:00:00",
    venue_id: "venue-2-id",
    creator_id: "event-planner-id",
    status: "approved_scheduled" as const,
    expected_attendance: 50,
    budget: 2000,
    notes: "Approved notes",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
  },
};

/**
 * Create mock Supabase query builder with proper chaining
 */
export function createMockSupabaseQuery(data: any, error: any = null) {
  const query: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    ilike: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };

  // Make all methods return the query object for chaining
  query.select.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.ilike.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  // Terminal methods that end the chain and return promises
  const promise = Promise.resolve({ data, error });
  query.then = promise.then.bind(promise);
  query.catch = promise.catch.bind(promise);
  query.finally = promise.finally.bind(promise);

  return query;
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
