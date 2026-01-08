/**
 * Event Status Transition Service
 *
 * Handles automatic status transitions for events based on business rules.
 *
 * NOTE: This is in BACKEND (not database trigger) because:
 * - Complex business logic with multiple steps
 * - Needs to send notifications
 * - Needs to log to audit trail with context
 * - Testable and maintainable
 * - Can be scheduled via cron
 *
 * Original plan called for a database trigger (auto_status_transition.sql)
 * but this is better implemented as a backend service.
 *
 * See: .cursor/rules/business-logic-placement/RULE.md
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventStatus = Database["public"]["Enums"]["event_status"];

/**
 * Transition events that have passed their date from approved_scheduled
 * to completed_awaiting_report
 *
 * This function should be called daily by a cron job.
 *
 * @returns Number of events transitioned
 *
 * @example
 * // Set up in Vercel cron or Supabase Edge Function
 * // Runs daily at midnight
 * const transitioned = await transitionCompletedEvents();
 * console.log(`Transitioned ${transitioned} events`);
 */
export async function transitionCompletedEvents(): Promise<{
  success: boolean;
  transitioned: number;
  errors: string[];
}> {
  const supabase = createClient();
  const errors: string[] = [];
  let transitioned = 0;

  try {
    // Find all approved events where event_date has passed
    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("status", "approved_scheduled")
      .lt("event_date", new Date().toISOString().split("T")[0]); // date < today

    if (fetchError) {
      throw new Error(`Failed to fetch events: ${fetchError.message}`);
    }

    if (!events || events.length === 0) {
      return { success: true, transitioned: 0, errors: [] };
    }

    // Transition each event
    for (const event of events) {
      try {
        await transitionSingleEvent(event);
        transitioned++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to transition event ${event.id}: ${message}`);
        console.error("Event transition error:", { eventId: event.id, error });
      }
    }

    return {
      success: errors.length === 0,
      transitioned,
      errors,
    };
  } catch (error) {
    console.error("Transition completed events error:", error);
    return {
      success: false,
      transitioned,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Transition a single event to completed_awaiting_report
 *
 * @param event - The event to transition
 */
async function transitionSingleEvent(event: Event): Promise<void> {
  const supabase = createClient();

  // 1. Update event status
  const { error: updateError } = await supabase
    .from("events")
    .update({
      status: "completed_awaiting_report" as EventStatus,
    })
    .eq("id", event.id);

  if (updateError) {
    throw new Error(`Failed to update event: ${updateError.message}`);
  }

  // 2. Log to audit trail
  const { error: auditError } = await supabase.from("audit_logs").insert({
    event_id: event.id,
    user_id: null, // System action
    action_type: "update_event",
    comment: "Event automatically transitioned to awaiting report after event date passed",
    metadata: {
      automated: true,
      old_status: "approved_scheduled",
      new_status: "completed_awaiting_report",
      event_date: event.event_date,
      transition_date: new Date().toISOString(),
    },
  });

  if (auditError) {
    console.error("Failed to log audit entry:", auditError);
    // Don't throw - transition succeeded even if logging failed
  }

  // 3. Send notification to event creator
  try {
    await notifyCreatorReportDue(event);
  } catch (error) {
    console.error("Failed to send notification:", error);
    // Don't throw - transition succeeded even if notification failed
  }
}

/**
 * Notify event creator that report is due
 *
 * @param event - The event that needs a report
 */
async function notifyCreatorReportDue(event: Event): Promise<void> {
  const supabase = createClient();

  // Get creator details
  const { data: creator, error } = await supabase
    .from("users")
    .select("id, name, email, notification_prefs")
    .eq("id", event.creator_id)
    .single();

  if (error || !creator) {
    throw new Error("Failed to fetch creator details");
  }

  // Check notification preferences
  const prefs = creator.notification_prefs as { email_enabled?: boolean };
  if (!prefs?.email_enabled) {
    return; // User has disabled email notifications
  }

  // TODO: Send email notification
  // This should be integrated with your email service (e.g., Resend, SendGrid)
  console.log("TODO: Send email notification", {
    to: creator.email,
    subject: "Event Report Required",
    eventTitle: event.title,
    eventDate: event.event_date,
  });

  // For now, just log that notification should be sent
  // Actual email implementation will be added in Phase 14 (Email Notifications)
}

/**
 * Manually transition a single event (for testing or admin actions)
 *
 * @param eventId - The event to transition
 * @param userId - User performing the action (for audit log)
 * @returns Success status
 */
export async function manuallyTransitionEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Verify event exists and is in correct status
    const { data: event, error: fetchError } = await supabase.from("events").select("*").eq("id", eventId).single();

    if (fetchError || !event) {
      return { success: false, error: "Event not found" };
    }

    if (event.status !== "approved_scheduled") {
      return {
        success: false,
        error: `Cannot transition event with status: ${event.status}`,
      };
    }

    // Transition the event
    await transitionSingleEvent(event);

    // Log manual action
    await supabase.from("audit_logs").insert({
      event_id: eventId,
      user_id: userId,
      action_type: "update_event",
      comment: "Event manually transitioned to awaiting report",
      metadata: {
        automated: false,
        manual_transition: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Manual transition error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get count of events that need transition
 *
 * @returns Number of events ready to transition
 */
export async function getEventsNeedingTransition(): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved_scheduled")
    .lt("event_date", new Date().toISOString().split("T")[0]);

  if (error) {
    console.error("Error counting events:", error);
    return 0;
  }

  return count || 0;
}

// =============================================
// CRON JOB SETUP
// =============================================

/**
 * OPTION 1: Vercel Cron (Recommended if deploying to Vercel)
 *
 * Create: /app/api/cron/transition-events/route.ts
 *
 * ```typescript
 * import { transitionCompletedEvents } from '@/lib/services/events/status-transition.service';
 * import { NextResponse } from 'next/server';
 *
 * export async function GET(request: Request) {
 *   // Verify cron secret
 *   const authHeader = request.headers.get('authorization');
 *   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   const result = await transitionCompletedEvents();
 *   return NextResponse.json(result);
 * }
 * ```
 *
 * Then in vercel.json:
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/cron/transition-events",
 *     "schedule": "0 0 * * *"  // Daily at midnight
 *   }]
 * }
 * ```
 */

/**
 * OPTION 2: Supabase Edge Function with pg_cron
 *
 * Create Supabase Edge Function and schedule with pg_cron:
 *
 * ```sql
 * SELECT cron.schedule(
 *   'transition-completed-events',
 *   '0 0 * * *',  -- Daily at midnight
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-project.supabase.co/functions/v1/transition-events',
 *     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 * ```
 */

/**
 * OPTION 3: External Cron Service
 *
 * Use services like:
 * - cron-job.org
 * - EasyCron
 * - GitHub Actions
 *
 * Configure to hit your API endpoint daily.
 */

// =============================================
// TESTING
// =============================================

/**
 * Test helper: Get events ready for transition
 *
 * Use this in tests to verify the logic
 */
export async function _testGetEventsReadyForTransition(): Promise<Event[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "approved_scheduled")
    .lt("event_date", new Date().toISOString().split("T")[0]);

  return data || [];
}
