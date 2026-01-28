/**
 * React Query hooks for Cancellations API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as cancellationsClientService from "@/lib/services/client/cancellations.client.service";
import { toast } from "sonner";

/**
 * React Query hook: Check if user can request cancellation
 */
export function useCanRequestCancellation(eventId: string | null) {
  return useQuery({
    queryKey: ["cancellations", "can-request", eventId],
    queryFn: () => cancellationsClientService.canRequestCancellation(eventId!),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * React Query hook: Request cancellation mutation
 */
export function useRequestCancellation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) =>
      cancellationsClientService.requestCancellation(eventId, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Cancellation request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to request cancellation", {
        description: error.message,
      });
    },
  });
}
