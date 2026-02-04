/**
 * React Query hooks for Venues API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateVenueInput, UpdateVenueInput } from "@/lib/validation/venues.schema";
import * as venueClientService from "@/lib/services/client/venues.client.service";
import type { VenueFilters } from "@/lib/services/client/venues.client.service";
import { toast } from "sonner";

// Re-export types from client service
export type { VenueFilters } from "@/lib/services/client/venues.client.service";

/**
 * React Query hook: Get venues with search (for VenueSelect)
 */
export function useVenuesWithSearch(search?: string) {
  return useQuery({
    queryKey: ["venues", "search", search],
    queryFn: () => venueClientService.fetchVenuesWithSearch(search),
    enabled: true, // Always enabled for search
  });
}

/**
 * React Query hook: Get venues with filters
 */
export function useVenues(filters: VenueFilters) {
  return useQuery({
    queryKey: ["venues", filters],
    queryFn: () => venueClientService.fetchVenues(filters),
  });
}

/**
 * React Query hook: Get a single venue by ID
 */
export function useVenue(id: string | null) {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: () => (id ? venueClientService.fetchVenueById(id) : Promise.reject(new Error("No ID provided"))),
    enabled: !!id,
  });
}

/**
 * React Query hook: Get a single venue by short ID
 */
export function useVenueByShortId(shortId: string | null) {
  return useQuery({
    queryKey: ["venue", "short-id", shortId],
    queryFn: () =>
      shortId ? venueClientService.fetchVenueByShortId(shortId) : Promise.reject(new Error("No short ID provided")),
    enabled: !!shortId,
  });
}

/**
 * React Query hook: Create venue mutation
 */
export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: venueClientService.createVenue,
    onSuccess: () => {
      // Invalidate venues queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create venue", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Update venue mutation
 */
export function useUpdateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVenueInput }) => venueClientService.updateVenue(id, input),
    onSuccess: (data, variables) => {
      // Invalidate specific venue and venues list
      queryClient.invalidateQueries({ queryKey: ["venue", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update venue", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Delete venue mutation
 */
export function useDeleteVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: venueClientService.deleteVenue,
    onSuccess: () => {
      // Invalidate venues queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete venue", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Check venue duplicate mutation
 * Returns mutation for checking if a venue with same name, street, city, country exists
 */
export function useCheckVenueDuplicate() {
  return useMutation({
    mutationFn: ({
      name,
      street,
      city,
      country,
      excludeId,
    }: {
      name: string;
      street: string;
      city: string;
      country: string;
      excludeId?: string;
    }) => venueClientService.checkVenueDuplicate(name, street, city, country, excludeId),
  });
}

/**
 * React Query hook: Ban venue mutation
 */
export function useBanVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => venueClientService.banVenue(id, reason),
    onSuccess: () => {
      // Invalidate venues queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue banned successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to ban venue", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Unban venue mutation
 */
export function useUnbanVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: venueClientService.unbanVenue,
    onSuccess: () => {
      // Invalidate venues queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      toast.success("Venue unbanned successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to unban venue", {
        description: error.message,
      });
    },
  });
}

// =============================================
// Venue Templates Hooks
// =============================================

/**
 * React Query hook: Get venue templates
 */
export function useVenueTemplates() {
  return useQuery({
    queryKey: ["venue-templates"],
    queryFn: () => venueClientService.fetchVenueTemplates(),
  });
}

/**
 * React Query hook: Get a single venue template by ID
 */
export function useVenueTemplate(id: string | null) {
  return useQuery({
    queryKey: ["venue-template", id],
    queryFn: () =>
      id ? venueClientService.fetchVenueTemplate(id) : Promise.reject(new Error("No template ID provided")),
    enabled: !!id,
  });
}

/**
 * React Query hook: Save venue as template mutation
 */
export function useSaveVenueAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, templateData }: { name: string; templateData: CreateVenueInput }) =>
      venueClientService.saveVenueAsTemplate(name, templateData),
    onSuccess: () => {
      // Invalidate templates queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venue-templates"] });
      toast.success("Venue template saved successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to save venue template", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Update venue template mutation
 */
export function useUpdateVenueTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; template_data?: CreateVenueInput } }) =>
      venueClientService.updateVenueTemplate(id, updates),
    onSuccess: (data, variables) => {
      // Invalidate templates queries
      queryClient.invalidateQueries({ queryKey: ["venue-templates"] });
      queryClient.invalidateQueries({ queryKey: ["venue-template", variables.id] });
      toast.success("Venue template updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update venue template", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Delete venue template mutation
 */
export function useDeleteVenueTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: venueClientService.deleteVenueTemplate,
    onSuccess: () => {
      // Invalidate templates queries to refetch
      queryClient.invalidateQueries({ queryKey: ["venue-templates"] });
      toast.success("Venue template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete venue template", {
        description: error.message,
      });
    },
  });
}
