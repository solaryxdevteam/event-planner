/**
 * React Query hooks for Users API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/users.schema";
import * as userClientService from "@/lib/services/client/users.client.service";
import { toast } from "sonner";

// Re-export types from client service
export type { UserFilters } from "@/lib/services/client/users.client.service";

/**
 * React Query hook: Get paginated users
 */
export function useUsers(filters: userClientService.UserFilters) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => userClientService.fetchUsers(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * React Query hook: Get potential parents for a role
 */
export function usePotentialParents(role: string | null) {
  return useQuery({
    queryKey: ["users", "potential-parents", role],
    queryFn: () =>
      role ? userClientService.fetchPotentialParents(role) : Promise.reject(new Error("No role provided")),
    enabled: !!role,
    staleTime: 5 * 60 * 1000, // 5 minutes (roles don't change often)
  });
}

/**
 * React Query hook: Create user mutation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userClientService.createUser,
    onSuccess: () => {
      // Invalidate users queries to refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "hierarchy"] });
      toast.success("User created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create user", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Update user mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => userClientService.updateUser(id, input),
    onSuccess: () => {
      // Invalidate users queries to refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "hierarchy"] });
      toast.success("User updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update user", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Deactivate user mutation
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userClientService.deactivateUser,
    onSuccess: () => {
      // Invalidate users queries to refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "hierarchy"] });
      toast.success("User deactivated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to deactivate user", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Activate user mutation
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof userClientService.activateUser>[1] }) =>
      userClientService.activateUser(id, input),
    onSuccess: () => {
      // Invalidate users queries to refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "hierarchy"] });
      toast.success("User activated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to activate user", {
        description: error.message,
      });
    },
  });
}
