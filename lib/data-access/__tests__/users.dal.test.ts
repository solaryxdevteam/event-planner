/**
 * User DAL Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersDal from "../users.dal";
import { mockUsers, createMockSupabaseQuery } from "@/tests/utils/test-helpers";

// Mock Supabase using vi.hoisted
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

describe("users.dal", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe("findAll", () => {
    it("should fetch all users filtered by subordinateUserIds", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findAll(["event-planner-id"]);

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockQuery.in).toHaveBeenCalledWith("id", ["event-planner-id"]);
      expect(result).toEqual([mockUsers.eventPlanner]);
    });

    it("should filter by role when provided", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      await usersDal.findAll(["event-planner-id"], { roleFilter: "event_planner" });

      expect(mockQuery.eq).toHaveBeenCalledWith("role", "event_planner");
    });

    it("should throw error on database failure", async () => {
      const mockQuery = createMockSupabaseQuery(null, { message: "Database error" });
      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(usersDal.findAll(["event-planner-id"])).rejects.toThrow("Failed to fetch users");
    });
  });

  describe("findById", () => {
    it("should fetch user by id with authorization check", async () => {
      const mockQuery = createMockSupabaseQuery(mockUsers.eventPlanner, null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findById("event-planner-id", ["event-planner-id"]);

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "event-planner-id");
      expect(mockQuery.in).toHaveBeenCalledWith("id", ["event-planner-id"]);
      expect(result).toEqual(mockUsers.eventPlanner);
    });

    it("should return null when user not found", async () => {
      const mockError = { code: "PGRST116", message: "Not found" };
      const mockQuery = createMockSupabaseQuery(null, mockError);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findById("nonexistent-id", ["event-planner-id"]);

      expect(result).toBeNull();
    });
  });

  describe("findByRole", () => {
    it("should fetch users by role", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findByRole("event_planner", ["event-planner-id"]);

      expect(mockQuery.eq).toHaveBeenCalledWith("role", "event_planner");
      expect(result).toEqual([mockUsers.eventPlanner]);
    });
  });

  describe("findChildren", () => {
    it("should fetch direct children of a user", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findChildren("city-curator-id");

      expect(mockQuery.eq).toHaveBeenCalledWith("parent_id", "city-curator-id");
      expect(result).toEqual([mockUsers.eventPlanner]);
    });
  });

  describe("insert", () => {
    it("should create a new user", async () => {
      const newUser = { ...mockUsers.eventPlanner, id: "new-id" };
      const mockQuery = createMockSupabaseQuery(newUser, null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.insert({
        email: "new@example.com",
        name: "New User",
        role: "event_planner",
        parent_id: "city-curator-id",
        country_id: "123e4567-e89b-12d3-a456-426614174001", // Mock US country ID
        state_id: "123e4567-e89b-12d3-a456-426614174002", // Mock state ID
        city_id: "123e4567-e89b-12d3-a456-426614174003", // Mock city ID
        is_active: true,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(result).toEqual(newUser);
    });

    it("should throw error on insert failure", async () => {
      const mockQuery = createMockSupabaseQuery(null, { message: "Insert failed" });
      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(
        usersDal.insert({
          email: "new@example.com",
          name: "New User",
          role: "event_planner",
          country_id: "123e4567-e89b-12d3-a456-426614174001", // Mock US country ID
          state_id: "123e4567-e89b-12d3-a456-426614174002", // Mock state ID
          city_id: "123e4567-e89b-12d3-a456-426614174003", // Mock city ID
          is_active: true,
        })
      ).rejects.toThrow("Failed to create user");
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const updatedUser = { ...mockUsers.eventPlanner, name: "Updated Name" };
      const mockQuery = createMockSupabaseQuery(updatedUser, null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.update("event-planner-id", { name: "Updated Name" });

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "event-planner-id");
      expect(result).toEqual(updatedUser);
    });
  });

  describe("deactivate", () => {
    it("should soft delete a user", async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      await usersDal.deactivate("event-planner-id");

      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "event-planner-id");
    });

    it("should throw error on deactivate failure", async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: "Failed" } }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(usersDal.deactivate("event-planner-id")).rejects.toThrow("Failed to deactivate user");
    });
  });

  describe("search", () => {
    it("should search users by name or email", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.search("planner", ["event-planner-id"]);

      expect(mockQuery.or).toHaveBeenCalled();
      expect(mockQuery.in).toHaveBeenCalledWith("id", ["event-planner-id"]);
      expect(result).toEqual([mockUsers.eventPlanner]);
    });
  });

  describe("findAllUnfiltered", () => {
    it("should fetch all users without filtering", async () => {
      const mockQuery = createMockSupabaseQuery([mockUsers.globalDirector, mockUsers.eventPlanner], null);
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await usersDal.findAllUnfiltered();

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(result).toHaveLength(2);
    });
  });
});
