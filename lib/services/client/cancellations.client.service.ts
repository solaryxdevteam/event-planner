/**
 * Cancellations Client Service
 *
 * Client-side service for cancellation operations
 * Makes API calls to /api/events endpoints via API client
 */

import { apiClient } from "./api-client";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

/**
 * Check if user can request cancellation for an event
 */
export async function canRequestCancellation(eventId: string): Promise<boolean> {
  try {
    const response = await apiClient.get<{ canRequest: boolean }>(`/api/events/${eventId}/can-cancel`);
    return response?.canRequest ?? false;
  } catch {
    return false;
  }
}

/**
 * Request cancellation for an event
 */
export async function requestCancellation(eventId: string, reason: string): Promise<EventWithRelations> {
  return apiClient.post<EventWithRelations>(`/api/events/${eventId}/cancel`, { reason });
}
