/**
 * User Hierarchy API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import * as hierarchyService from "@/lib/services/users/hierarchy.service";

// Mock dependencies using vi.hoisted
const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/services/users/hierarchy.service");

describe("GET /api/users/hierarchy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: "user-id", dbUser: {} });
  });

  it("should return hierarchy tree for authenticated users", async () => {
    const mockTree = [
      {
        id: "global-director-id",
        name: "Global Director",
        email: "global@example.com",
        role: "global_director",
        city: "HQ",
        region: "Global",
        is_active: true,
        children: [
          {
            id: "event-planner-id",
            name: "Event Planner",
            email: "planner@example.com",
            role: "event_planner",
            city: "Boston",
            region: "Northeast",
            is_active: true,
            children: [],
          },
        ],
      },
    ];

    vi.mocked(hierarchyService.getHierarchyTree).mockResolvedValue(mockTree as any);

    const request = new NextRequest("http://localhost:3000/api/users/hierarchy");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockTree);
    expect(mockRequireAuth).toHaveBeenCalled();
  });

  it("should return 500 if authentication fails", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Not authenticated"));

    const request = new NextRequest("http://localhost:3000/api/users/hierarchy");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Not authenticated");
  });

  it("should return 500 if hierarchy service fails", async () => {
    vi.mocked(hierarchyService.getHierarchyTree).mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest("http://localhost:3000/api/users/hierarchy");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it("should return empty array if no users exist", async () => {
    vi.mocked(hierarchyService.getHierarchyTree).mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/users/hierarchy");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });
});
