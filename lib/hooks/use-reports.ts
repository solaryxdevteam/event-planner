/**
 * React Query hooks for Reports API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as reportsClientService from "@/lib/services/client/reports.client.service";
import { toast } from "sonner";
import type { SubmitReportData, ListApprovedReportsParams } from "@/lib/services/client/reports.client.service";

/**
 * React Query hook: Get report by event ID
 */
export function useReport(eventId: string | null) {
  return useQuery({
    queryKey: ["reports", eventId],
    queryFn: () => reportsClientService.getReportByEventId(eventId!),
    enabled: !!eventId,
  });
}

/**
 * React Query hook: Submit report mutation
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: SubmitReportData }) =>
      reportsClientService.submitReport(eventId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Report submitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to submit report", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Update report mutation (resubmission)
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, eventId, data }: { reportId: string; eventId: string; data: SubmitReportData }) =>
      reportsClientService.updateReport(reportId, eventId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Report updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update report", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: List approved reports with filters, sort, pagination; optionally chart data
 */
export function useApprovedReportsList(params: ListApprovedReportsParams) {
  return useQuery({
    queryKey: ["reports", "approved", params],
    queryFn: () => reportsClientService.listApprovedReports(params),
  });
}
