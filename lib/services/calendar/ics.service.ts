/**
 * ICS (iCalendar) Service
 * Generates .ics content for calendar invites so recipients can add events to their calendar.
 */

/** Input for building an ICS event (subset of event + venue) */
export interface IcsEventInput {
  title: string;
  /** ISO datetime string */
  startsAt: string;
  /** ISO datetime string; if not provided, defaults to startsAt + 5 hours */
  endsAt?: string | null;
  /** Venue name */
  venueName?: string | null;
  /** Full address for location */
  venueAddress?: string | null;
  /** Optional description (e.g. notes) */
  description?: string | null;
  /** Stable unique id for the calendar event (e.g. event id or short_id) */
  uid: string;
}

const DEFAULT_DURATION_HOURS = 5;

function formatIcsDate(isoDate: Date): string {
  return isoDate
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Build iCalendar (.ics) content for a single event.
 * RFC 5545 compatible; clients like Gmail/Outlook will offer "Add to Calendar".
 */
export function buildIcsContent(input: IcsEventInput): string {
  const start = new Date(input.startsAt);
  const endInput = input.endsAt ? new Date(input.endsAt) : null;
  const end = endInput ?? new Date(start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000);

  const locationParts = [input.venueName, input.venueAddress].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : undefined;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Management Platform//Calendar Invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@event-platform`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  if (input.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description.trim())}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
