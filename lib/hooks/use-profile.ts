/**
 * React Query hooks for User Profile API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as profileClientService from "@/lib/services/client/profile.client.service";
import { toast } from "sonner";

/**
 * React Query hook: Get current user profile
 */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: profileClientService.fetchProfile,
  });
}

/**
 * React Query hook: Update profile mutation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileClientService.updateProfile,
    onSuccess: (data) => {
      // Update the profile cache
      queryClient.setQueryData(["profile"], data);
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });
}
