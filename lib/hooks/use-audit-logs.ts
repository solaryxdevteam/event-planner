/**
 * React Query hooks for Audit Logs API
 */

import { useQuery } from "@tanstack/react-query";
import * as auditClientService from "@/lib/services/client/audit.client.service";

/**
 * React Query hook: Get audit logs for an event
 *
 * NOTE: This is kept for backward compatibility with existing event detail views.
 * For new global logs views, use `useAuditLogs` instead.
 */
export function useEventAuditLogs(eventId: string | null) {
  return useQuery({
    queryKey: ["audit-logs", "event", eventId],
    // This function is provided by the legacy audit client service in components that use it.
    // We keep the minimal implementation here to avoid breaking existing event pages.
    queryFn: () => {
      if (!eventId) {
        return Promise.resolve([]);
      }
      // Dynamic import to avoid circular dependency with the new client service
      return import("@/lib/services/client/audit.client.service").then((mod) => mod.getEventAuditLogs(eventId));
    },
    enabled: !!eventId,
  });
}

/**
 * React Query hook: Get paginated audit logs with filters (global logs view)
 */
export function useAuditLogs(filters: auditClientService.AuditLogFilters) {
  // Create a stable query key using only primitive values from filters
  // This prevents unnecessary re-fetches due to object identity changes.
  const queryKey = [
    "audit-logs",
    "global",
    filters.page ?? 1,
    filters.limit ?? 20,
    filters.actionType ?? null,
    filters.userId ?? null,
    filters.dateFrom ?? null,
    filters.dateTo ?? null,
  ] as const;

  return useQuery({
    queryKey,
    queryFn: () => auditClientService.fetchAuditLogs(filters),
    retry: 1,
  });
}
