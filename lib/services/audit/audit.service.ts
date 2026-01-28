/**
 * Audit Service
 *
 * Business logic for audit logging
 */

import * as auditDAL from "@/lib/data-access/audit-logs.dal";
import type { AuditLogWithUser, AuditLogFilterOptions } from "@/lib/data-access/audit-logs.dal";
import type { Database } from "@/lib/types/database.types";

type ActionType = Database["public"]["Enums"]["action_type"];

/**
 * Log an audit action
 */
export async function log(
  actionType: ActionType,
  userId: string,
  eventId: string | null,
  metadata?: Record<string, unknown>,
  comment?: string
): Promise<void> {
  await auditDAL.insert({
    action_type: actionType,
    user_id: userId,
    event_id: eventId,
    metadata: metadata || {},
    comment: comment || null,
  });
}

/**
 * Get audit logs for an event
 */
export async function getEventAuditLog(eventId: string): Promise<AuditLogWithUser[]> {
  return auditDAL.findByEventId(eventId, true);
}

/**
 * Filter audit logs with various criteria
 */
export async function filterLogs(filters: AuditLogFilterOptions): Promise<AuditLogWithUser[]> {
  return auditDAL.filterLogs(filters, true);
}
