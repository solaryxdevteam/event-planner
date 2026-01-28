"use client";

import { EventCard } from "./EventCard";
import { useEventApprovals } from "@/lib/hooks/use-approvals";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

interface EventCardWithModificationCheckProps {
  event: EventWithRelations;
  onView?: (eventShortId: string) => void;
  onDelete?: (eventId: string) => void;
  onSubmit?: (eventId: string) => void;
  showActions?: boolean;
}

/**
 * Wrapper component that checks for pending modifications and passes to EventCard
 * This allows us to use hooks properly (not in a loop)
 */
export function EventCardWithModificationCheck({
  event,
  onView,
  onDelete,
  onSubmit,
  showActions,
}: EventCardWithModificationCheckProps) {
  // Only check for modifications if event is approved_scheduled
  const { data: approvals } = useEventApprovals(event.status === "approved_scheduled" ? event.id : null);

  const hasPendingModification =
    approvals?.some(
      (a: { approval_type?: string; status?: string }) =>
        a.approval_type === "modification" && (a.status === "pending" || a.status === "waiting")
    ) || false;

  return (
    <EventCard
      event={event}
      onView={onView}
      onDelete={onDelete}
      onSubmit={onSubmit}
      showActions={showActions}
      hasPendingModification={hasPendingModification}
    />
  );
}
