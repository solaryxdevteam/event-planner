/**
 * React Query hooks for DJs API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateDjInput } from "@/lib/validation/djs.schema";
import * as djsClient from "@/lib/services/client/djs.client.service";
import type { DJFilters } from "@/lib/services/client/djs.client.service";
import { toast } from "sonner";

export type { DJFilters } from "@/lib/services/client/djs.client.service";

export function useDjs(filters: DJFilters) {
  return useQuery({
    queryKey: ["djs", filters],
    queryFn: () => djsClient.fetchDjs(filters),
  });
}

export function useDj(id: string | null) {
  return useQuery({
    queryKey: ["dj", id],
    queryFn: () => (id ? djsClient.fetchDjById(id) : Promise.reject(new Error("No ID"))),
    enabled: !!id,
  });
}

export function useActiveDjs(search?: string) {
  return useQuery({
    queryKey: ["djs", "active", search],
    queryFn: () => djsClient.fetchActiveDjs(search),
  });
}

export function useCreateDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: djsClient.createDj,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["djs"] });
      toast.success("DJ added successfully. A notification email was sent.");
    },
    onError: (error: Error) => {
      toast.error("Failed to add DJ", { description: error.message });
    },
  });
}

export function useUpdateDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDjInput }) => djsClient.updateDj(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dj", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["djs"] });
      toast.success("DJ updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update DJ", { description: error.message });
    },
  });
}

export function useDeleteDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: djsClient.deleteDj,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["djs"] });
      toast.success("DJ deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete DJ", { description: error.message });
    },
  });
}

export function useActivateDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: djsClient.activateDj,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["djs"] });
      toast.success("DJ activated");
    },
    onError: (error: Error) => {
      toast.error("Failed to activate DJ", { description: error.message });
    },
  });
}

export function useDeactivateDj() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: djsClient.deactivateDj,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["djs"] });
      toast.success("DJ deactivated");
    },
    onError: (error: Error) => {
      toast.error("Failed to deactivate DJ", { description: error.message });
    },
  });
}
