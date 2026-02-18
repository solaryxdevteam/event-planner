/**
 * React Query hooks for Approvals API
 *
 * Uses client services to make API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApprovalType } from "@/lib/types/database.types";

interface ApprovalFilters {
  approval_type?: ApprovalType;
}

interface ApprovalAction {
  eventId: string;
  comment: string;
  verificationToken?: string;
}

/**
 * Fetch approvals with filters
 */
async function fetchApprovals(filters: ApprovalFilters = {}) {
  const params = new URLSearchParams();

  if (filters.approval_type) {
    params.append("type", filters.approval_type);
  }

  const response = await fetch(`/api/approvals?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch approvals");
  }

  return response.json();
}

/**
 * Approve an event (requires verificationToken from OTP verification)
 */
async function approveEvent({ eventId, comment, verificationToken }: ApprovalAction) {
  const response = await fetch(`/api/approvals/${eventId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, verificationToken: verificationToken ?? "" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve event");
  }

  return response.json();
}

/**
 * Reject an event (requires verificationToken from OTP verification)
 */
async function rejectEvent({ eventId, comment, verificationToken }: ApprovalAction) {
  const response = await fetch(`/api/approvals/${eventId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, verificationToken: verificationToken ?? "" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reject event");
  }

  return response.json();
}

/**
 * React Query hook: Get approvals with filters
 */
export function useApprovals(filters: ApprovalFilters = {}) {
  return useQuery({
    queryKey: ["approvals", filters],
    queryFn: () => fetchApprovals(filters),
  });
}

/**
 * React Query hook: Approve event mutation
 */
export function useApproveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["event-versions"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-reports"] });
      toast.success("Event approved successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve event", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query hook: Reject event mutation
 */
export function useRejectEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["event-versions"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-reports"] });
      toast.success("Event rejected successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject event", {
        description: error.message,
      });
    },
  });
}

/**
 * Fetch approvals for a specific event
 */
async function fetchEventApprovals(eventId: string) {
  const response = await fetch(`/api/events/${eventId}/approvals`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch event approvals");
  }

  return response.json();
}

/**
 * React Query hook: Get approval chain for a specific event
 */
export function useEventApprovals(eventId: string | null | undefined) {
  return useQuery({
    queryKey: ["event-approvals", eventId],
    queryFn: () => fetchEventApprovals(eventId!),
    enabled: !!eventId,
  });
}

// --- Venue approvals ---

async function fetchVenueApprovals() {
  const response = await fetch("/api/approvals?type=venue");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch venue approvals");
  }
  return response.json();
}

async function approveVenue({
  venueId,
  comment,
  verificationToken,
}: {
  venueId: string;
  comment: string;
  verificationToken: string;
}) {
  const response = await fetch(`/api/venue-approvals/${venueId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, verificationToken }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve venue");
  }
  return response.json();
}

async function rejectVenue({
  venueId,
  comment,
  verificationToken,
}: {
  venueId: string;
  comment: string;
  verificationToken: string;
}) {
  const response = await fetch(`/api/venue-approvals/${venueId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, verificationToken }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reject venue");
  }
  return response.json();
}

/**
 * React Query hook: Get pending venue approvals for current user
 */
export function useVenueApprovals() {
  return useQuery({
    queryKey: ["approvals", "venue"],
    queryFn: fetchVenueApprovals,
  });
}

async function fetchVenueApprovalChain(venueId: string) {
  const response = await fetch(`/api/venues/${venueId}/approvals`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch venue approval chain");
  }
  return response.json();
}

/**
 * React Query hook: Get approval chain for a specific venue (for timeline display)
 */
export function useVenueApprovalChain(venueId: string | null | undefined) {
  return useQuery({
    queryKey: ["venue-approvals", venueId],
    queryFn: () => fetchVenueApprovalChain(venueId!),
    enabled: !!venueId,
  });
}

/**
 * React Query hook: Approve venue mutation
 */
export function useApproveVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venue-approvals"] });
      toast.success("Venue approved successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve venue", { description: error.message });
    },
  });
}

/**
 * React Query hook: Reject venue mutation
 */
export function useRejectVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["venue-approvals"] });
      toast.success("Venue rejected successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject venue", { description: error.message });
    },
  });
}
