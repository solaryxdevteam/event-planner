/**
 * React Query hooks for Marketing Reports and Marketing Assets API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as eventsClientService from "@/lib/services/client/events.client.service";
import { toast } from "sonner";
import type { MarketingReport } from "@/lib/types/database.types";

export function useMarketingReports(eventId: string | null) {
  return useQuery({
    queryKey: ["marketing-reports", eventId],
    queryFn: () => eventsClientService.fetchMarketingReports(eventId!),
    enabled: !!eventId,
  });
}

export function useSubmitMarketingReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, notes }: { eventId: string; notes: string | null }) =>
      eventsClientService.submitMarketingReport(eventId, notes),
    onSuccess: (data: MarketingReport, variables) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-reports"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-reports", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Marketing report submitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to submit marketing report", {
        description: error.message,
      });
    },
  });
}

export function useUpdateEventMarketingAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: eventsClientService.EventMarketingAssetsPayload }) =>
      eventsClientService.updateEventMarketingAssets(eventId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      toast.success("Marketing assets updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update marketing assets", {
        description: error.message,
      });
    },
  });
}
