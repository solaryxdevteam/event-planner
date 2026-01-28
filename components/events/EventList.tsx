"use client";

import { EventCard } from "./EventCard";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { EventCardWithModificationCheck } from "./EventCardWithModificationCheck";

interface EventListProps {
  events: EventWithRelations[];
  onView?: (eventShortId: string) => void;
  onDelete?: (eventId: string) => void;
  onSubmit?: (eventId: string) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export function EventList({
  events,
  onView,
  onDelete,
  onSubmit,
  showActions = true,
  emptyMessage = "No events found",
}: EventListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No events found</h3>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCardWithModificationCheck
          key={event.id}
          event={event}
          onView={onView}
          onDelete={onDelete}
          onSubmit={onSubmit}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
