/**
 * Audit Logs Data Access Layer (DAL)
 *
 * Pure database operations for audit_logs table
 * Used for tracking all actions and changes in the system
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

/**
 * Audit log with user information
 */
export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Raw audit log data from Supabase with user relation
 */
interface AuditLogWithUserRaw extends AuditLog {
  user?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
}

/**
 * Filter options for audit logs
 */
export interface AuditLogFilterOptions {
  eventId?: string;
  userId?: string;
  actionType?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get audit logs for an event
 */
export async function findByEventId(eventId: string, includeUser: boolean = true): Promise<AuditLogWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      includeUser
        ? `
          *,
          user:users!audit_logs_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
        : "*"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  // Transform data to construct user name
  return (data || []).map((log: AuditLogWithUserRaw) => ({
    ...log,
    user: log.user
      ? {
          id: log.user.id,
          email: log.user.email,
          role: log.user.role,
          name: log.user.last_name ? `${log.user.first_name} ${log.user.last_name}` : log.user.first_name,
        }
      : undefined,
  })) as AuditLogWithUser[];
}

/**
 * Get audit logs by user
 */
export async function findByUser(userId: string, includeUser: boolean = true): Promise<AuditLogWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      includeUser
        ? `
          *,
          user:users!audit_logs_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
        : "*"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  // Transform data to construct user name
  return (data || []).map((log: AuditLogWithUserRaw) => ({
    ...log,
    user: log.user
      ? {
          id: log.user.id,
          email: log.user.email,
          role: log.user.role,
          name: log.user.last_name ? `${log.user.first_name} ${log.user.last_name}` : log.user.first_name,
        }
      : undefined,
  })) as AuditLogWithUser[];
}

/**
 * Filter audit logs with various criteria
 */
export async function filterLogs(
  filters: AuditLogFilterOptions = {},
  includeUser: boolean = true
): Promise<AuditLogWithUser[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      includeUser
        ? `
          *,
          user:users!audit_logs_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `
        : "*"
    )
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters.eventId) {
    query = query.eq("event_id", filters.eventId);
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.actionType) {
    if (Array.isArray(filters.actionType)) {
      query = query.in("action_type", filters.actionType);
    } else {
      query = query.eq("action_type", filters.actionType);
    }
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  // Apply pagination
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to filter audit logs: ${error.message}`);
  }

  // Transform data to construct user name
  return (data || []).map((log: AuditLogWithUserRaw) => ({
    ...log,
    user: log.user
      ? {
          id: log.user.id,
          email: log.user.email,
          role: log.user.role,
          name: log.user.last_name ? `${log.user.first_name} ${log.user.last_name}` : log.user.first_name,
        }
      : undefined,
  })) as AuditLogWithUser[];
}

/**
 * Create a new audit log entry.
 * Requires action_type so we never hit the DB NOT NULL constraint.
 */
export async function insert(logEntry: AuditLogInsert): Promise<AuditLog> {
  if (logEntry.action_type == null || logEntry.action_type === undefined) {
    throw new Error(
      "Audit log insert requires action_type. If you see this with approve_report, ensure the legacy audit trigger is dropped (run db/drop_legacy_audit_trigger.sql)."
    );
  }

  const supabase = await createClient();

  const row = {
    action_type: logEntry.action_type,
    user_id: logEntry.user_id ?? null,
    event_id: logEntry.event_id ?? null,
    comment: logEntry.comment ?? null,
    metadata: logEntry.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("audit_logs")
    // @ts-expect-error - Supabase type inference issue with Database types
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return data;
}
