/**
 * React Query hooks for Invitations API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as invitationClientService from "@/lib/services/client/invitations.client.service";
import { toast } from "sonner";

// Re-export types from client service
export type { CreateInvitationInput } from "@/lib/services/client/invitations.client.service";

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
      // Invalidate users queries since invitations affect user management
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Invitation created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create invitation", {
        description: error.message,
      });
    },
  });
}
