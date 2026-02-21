/**
 * React Query hooks for Invitations API
 *
 * Uses client services and server actions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as invitationClientService from "@/lib/services/client/invitations.client.service";
import { listInvitations } from "@/lib/actions/invitations";
import { toast } from "sonner";

// Re-export types from client service
export type { CreateInvitationInput } from "@/lib/services/client/invitations.client.service";

/**
 * React Query hook: List all invitations (Global Director only)
 */
export function useInvitationsList(enabled: boolean) {
  return useQuery({
    queryKey: ["invitations", "list"],
    queryFn: async () => {
      const result = await listInvitations();
      if (!result.success || result.data === undefined) {
        throw new Error(result.error ?? "Failed to load invitations");
      }
      return result.data;
    },
    enabled,
  });
}

/**
 * React Query hook: Validate invitation token
 */
export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: ["invitations", "validate", token],
    queryFn: () =>
      token ? invitationClientService.validateInvitation(token) : Promise.reject(new Error("No token provided")),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Query hook: Create invitation mutation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invitationClientService.createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["invitations", "list"] });
      toast.success("Invitation created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create invitation", {
        description: error.message,
      });
    },
  });
}
