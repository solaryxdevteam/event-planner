/**
 * User Actions Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as userActions from "../users";
import * as userService from "@/lib/services/users/user.service";
import * as hierarchyService from "@/lib/services/users/hierarchy.service";
import { mockUsers } from "@/tests/utils/test-helpers";

// Mock dependencies using vi.hoisted
const { mockRequireRole, mockRequireAuth, mockRevalidatePath } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireRole: mockRequireRole,
  requireAuth: mockRequireAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/services/users/user.service");
vi.mock("@/lib/services/users/hierarchy.service");

describe("User Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ id: "global-director-id", dbUser: mockUsers.globalDirector });
    mockRequireAuth.mockResolvedValue({ id: "global-director-id", dbUser: mockUsers.globalDirector });
  });

  describe("getUsers", () => {
    it("should return all users for Global Director", async () => {
      vi.mocked(userService.getAllUsers).mockResolvedValue([mockUsers.globalDirector, mockUsers.eventPlanner]);

      const result = await userActions.getUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockRequireRole).toHaveBeenCalledWith(["global_director"]);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(userService.getAllUsers).mockRejectedValue(new Error("Database error"));

      const result = await userActions.getUsers();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  describe("createUser", () => {
    it("should create a user with valid data", async () => {
      const parentId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
      const newUser = {
        email: "new@example.com",
        name: "New User",
        role: "event_planner" as const,
        parent_id: parentId,
        city: "Boston",
        region: "Northeast",
      };

      vi.mocked(userService.createUser).mockResolvedValue({
        ...mockUsers.eventPlanner,
        ...newUser,
      });

      const result = await userActions.createUser(newUser);

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(newUser.email);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should validate input data", async () => {
      const invalidData = {
        email: "invalid-email",
        name: "",
        role: "invalid_role" as any,
        parent_id: null,
        country_id: "invalid-uuid",
        state_id: "invalid-uuid",
        city_id: "invalid-uuid",
      };

      const result = await userActions.createUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle service errors", async () => {
      const parentId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
      const newUser = {
        email: "new@example.com",
        name: "New User",
        role: "event_planner" as const,
        parent_id: parentId,
        country_id: "123e4567-e89b-12d3-a456-426614174001", // Mock US country ID
        state_id: "123e4567-e89b-12d3-a456-426614174002", // Mock state ID
        city_id: "123e4567-e89b-12d3-a456-426614174003", // Mock city ID
      };

      vi.mocked(userService.createUser).mockRejectedValue(new Error("A user with this email already exists"));

      const result = await userActions.createUser(newUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("updateUser", () => {
    it("should update a user", async () => {
      const updates = { name: "Updated Name" };

      vi.mocked(userService.updateUser).mockResolvedValue({
        ...mockUsers.eventPlanner,
        name: "Updated Name",
      });

      const result = await userActions.updateUser("event-planner-id", updates);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Updated Name");
      expect(mockRevalidatePath).toHaveBeenCalled();
    });
  });

  describe("deactivateUser", () => {
    it("should deactivate a user", async () => {
      const userId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
      vi.mocked(userService.deactivateUser).mockResolvedValue(undefined);

      const result = await userActions.deactivateUser(userId);

      expect(result.success).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should handle errors when deactivating self", async () => {
      const userId = "123e4567-e89b-12d3-a456-426614174001"; // Valid UUID
      vi.mocked(userService.deactivateUser).mockRejectedValue(new Error("Cannot deactivate your own account"));

      const result = await userActions.deactivateUser(userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot deactivate your own account");
    });
  });

  describe("checkGlobalDirectorPassword", () => {
    it("should return true for correct password", async () => {
      vi.mocked(userService.checkGlobalDirectorPassword).mockResolvedValue(true);

      const result = await userActions.checkGlobalDirectorPassword("SecurePassword123!");

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      vi.mocked(userService.checkGlobalDirectorPassword).mockResolvedValue(false);

      const result = await userActions.checkGlobalDirectorPassword("wrong-password");

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe("getUserHierarchy", () => {
    it("should return hierarchy tree", async () => {
      const mockTree = [
        {
          id: "global-director-id",
          name: "Global Director",
          email: "global@example.com",
          role: "global_director",
          city: "HQ",
          region: "Global",
          is_active: true,
          children: [],
        },
      ];

      vi.mocked(hierarchyService.getHierarchyTree).mockResolvedValue(mockTree as any);

      const result = await userActions.getUserHierarchy();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTree);
    });
  });

  describe("getPotentialParents", () => {
    it("should return valid parents for event_planner role", async () => {
      vi.mocked(userService.getAllUsers).mockResolvedValue([mockUsers.globalDirector, mockUsers.eventPlanner]);

      const result = await userActions.getPotentialParents("event_planner");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Event planners can have city_curator or above as parent
      expect(result.data?.every((u) => u.role !== "event_planner")).toBe(true);
    });

    it("should return empty array for global_director role", async () => {
      vi.mocked(userService.getAllUsers).mockResolvedValue([mockUsers.globalDirector]);

      const result = await userActions.getPotentialParents("global_director");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
