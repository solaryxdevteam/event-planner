/**
 * Audit Client Service
 *
 * Client-side service for audit log operations
 * - Global audit logs (with filters & pagination)
 * - Per-event audit logs (for event detail views)
 */

import { apiClient } from "./api-client";
import type { AuditLogWithUser } from "@/lib/data-access/audit-logs.dal";

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actionType?: string | null;
  userId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface AuditLogListResponse {
  logs: AuditLogWithUser[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Fetch paginated global audit logs with filters
 *
 * Note: `apiClient.get` already unwraps the `{ success, data }` envelope from the API
 * and returns the `data` field (or throws on error), so we request `AuditLogListResponse` directly.
 */
export async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLogListResponse> {
  const params: Record<string, string | number | boolean | null | undefined> = {
    page: filters.page,
    limit: filters.limit,
    actionType: filters.actionType || undefined,
    userId: filters.userId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  return apiClient.get<AuditLogListResponse>("/api/audit-logs", { params });
}

/**
 * Get audit logs for an event
 */
export async function getEventAuditLogs(eventId: string): Promise<AuditLogWithUser[]> {
  return apiClient.get<AuditLogWithUser[]>(`/api/events/${eventId}/audit-logs`);
}
