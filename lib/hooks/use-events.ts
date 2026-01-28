/**
 * React Query hooks for Events API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validation/events.schema";
import * as eventsClientService from "@/lib/services/client/events.client.service";
import { toast } from "sonner";

// Re-export types from client service
export type { EventFilters } from "@/lib/services/client/events.client.service";

/**
 * React Query hook: Get events with filters
 */
export function useEvents(filters: eventsClientService.EventFilters) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => eventsClientService.fetchEvents(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * React Query hook: Get single event by ID
 */
export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventsClientService.fetchEventById(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * React Query hook: Create event draft mutation
 */
export function useCreateEventDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventsClientService.createEventDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Draft created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create draft", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Update event draft mutation
 */
export function useUpdateEventDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) =>
      eventsClientService.updateEventDraft(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", data.id] });
      // Don't show toast for auto-save
    },
    onError: (error: Error) => {
      // Don't show toast for auto-save errors
      console.error("Auto-save failed:", error);
    },
  });
}

/**
 * React Query hook: Delete event draft mutation
 */
export function useDeleteEventDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventsClientService.deleteEventDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Draft deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete draft", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Submit event for approval mutation
 */
export function useSubmitEventForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventsClientService.submitEventForApproval,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", data.id] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Event submitted for approval");
    },
    onError: (error: Error) => {
      toast.error("Failed to submit event", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Get the first draft for the current user
 */
export function useFirstDraft() {
  return useQuery({
    queryKey: ["events", "draft", "first"],
    queryFn: () => eventsClientService.fetchFirstDraft(),
    staleTime: 10 * 1000, // 10 seconds (short because it's checked on mount)
  });
}

/**
 * React Query hook: Manually transition event to completed mutation
 * Requires Global Director role
 */
export function useTransitionEventToCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsClientService.transitionEventToCompleted(id),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      toast.success("Event transitioned to completed successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to transition event", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Request modification for an approved event
 */
export function useRequestModification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      modificationData,
      changeReason,
    }: {
      id: string;
      modificationData: CreateEventInput;
      changeReason?: string;
    }) => eventsClientService.requestModification(id, modificationData, changeReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", data.id] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Modification request submitted for approval");
    },
    onError: (error: Error) => {
      toast.error("Failed to request modification", {
        description: error.message,
      });
    },
  });
}
