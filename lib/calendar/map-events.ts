import { format, addHours } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { CalendarEvent } from "./types";
import { STATUS_COLOR_MAP } from "./constants";

export function mapEventToCalendarEvent(event: EventWithRelations): CalendarEvent {
  const startsAt = event.starts_at ? new Date(event.starts_at) : new Date();
  const startTime = format(startsAt, "HH:mm");
  const endDate = addHours(startsAt, 2);
  const endTime = format(endDate, "HH:mm");

  const djName = event.dj?.name || null;
  const displayTitle = djName ? `${event.title} • ${djName}` : event.title;

  return {
    id: event.id,
    title: displayTitle,
    description: event.notes || "",
    startDate: startsAt,
    endDate: endDate,
    startTime,
    endTime,
    isRepeating: false,
    repeatingType: null,
    location: event.venue?.name || "",
    category: event.status,
    color: STATUS_COLOR_MAP[event.status] || "blue",
    createdAt: new Date(event.created_at),
    updatedAt: new Date(event.updated_at),
    shortId: event.short_id,
    status: event.status,
    djName,
    djId: event.dj?.id || null,
    venueName: event.venue?.name || null,
    venueCity: event.venue?.city || null,
    venueCountry: event.venue?.country || null,
    creatorName: event.creator?.name || null,
    expectedAttendance: event.expected_attendance,
  };
}

export function mapEventsToCalendarEvents(events: EventWithRelations[]): CalendarEvent[] {
  return events.map(mapEventToCalendarEvent);
}
