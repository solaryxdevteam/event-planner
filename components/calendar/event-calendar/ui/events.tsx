import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeDisplay } from "@/lib/calendar/date-utils";
import { getColorClasses, getCategoryLabel } from "@/lib/calendar/event-utils";
import { cn } from "@/lib/utils";
import { CalendarViewType, CalendarEvent, TimeFormatType } from "@/lib/calendar/types";
import { endOfWeek, format, Locale, startOfWeek } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import { memo } from "react";

export const NoEvents = memo(
  ({ currentDate, currentView, locale }: { currentDate: Date; currentView: CalendarViewType; locale?: Locale }) => {
    const getNoEventsMessage = () => {
      switch (currentView) {
        case CalendarViewType.DAY:
          return `No events on ${format(currentDate, "EEEE, d MMMM yyyy", { locale })}`;
        case CalendarViewType.WEEK:
          const weekStart = format(startOfWeek(currentDate, { locale }), "d MMM", { locale });
          const weekEnd = format(endOfWeek(currentDate, { locale }), "d MMM yyyy", { locale });
          return `No events for week ${weekStart} - ${weekEnd}`;
        case CalendarViewType.MONTH:
          return `No events in ${format(currentDate, "MMMM yyyy", { locale })}`;
        case CalendarViewType.YEAR:
          return `No events in ${format(currentDate, "yyyy", { locale })}`;
        default:
          return "No events";
      }
    };

    return (
      <div
        className="text-muted-foreground flex h-[calc(100vh-12rem)] flex-col items-center justify-center"
        data-testid="no-events-message"
      >
        <Calendar className="mb-2 h-12 w-12 opacity-20" />
        <p>{getNoEventsMessage()}</p>
      </div>
    );
  }
);

NoEvents.displayName = "NoEvents";

const BORDER_LEFT_CLASSES: Record<string, string> = {
  blue: "border-l-blue-500",
  red: "border-l-red-500",
  amber: "border-l-amber-500",
  yellow: "border-l-yellow-500",
  lime: "border-l-lime-500",
  green: "border-l-green-500",
  purple: "border-l-purple-500",
  pink: "border-l-pink-500",
  indigo: "border-l-indigo-500",
  teal: "border-l-teal-500",
};

export const EventCard = ({
  event,
  timeFormat,
  onClick,
}: {
  event: CalendarEvent;
  timeFormat: TimeFormatType;
  onClick: (event: CalendarEvent) => void;
}) => {
  const { badge } = getColorClasses(event.color);
  const borderLeft = BORDER_LEFT_CLASSES[event.color] ?? BORDER_LEFT_CLASSES.blue;
  const statusLabel = getCategoryLabel(event.category);
  return (
    <Button
      key={event.id}
      variant="ghost"
      data-testid={`event-item-${event.id}`}
      className={cn(
        "group/event relative z-0 flex h-auto w-full flex-col items-start justify-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
        "border-l-4",
        borderLeft
      )}
      onClick={() => onClick(event)}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="text-wrap text-base font-medium text-foreground">{event.title}</span>
        <Badge
          variant="secondary"
          className={cn("shrink-0 font-normal", badge.bg, badge.text, "text-white hover:text-black")}
        >
          {statusLabel}
        </Badge>
      </div>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>
            {formatTimeDisplay(event.startTime, timeFormat)} - {formatTimeDisplay(event.endTime, timeFormat)}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
      </div>
    </Button>
  );
};

export const EventGroup = memo(
  ({
    timeKey,
    events,
    timeFormat,
    onClick,
  }: {
    timeKey: string;
    events: CalendarEvent[];
    timeFormat: TimeFormatType;
    onClick: (event: CalendarEvent) => void;
  }) => (
    <div key={timeKey} className="gap-0 overflow-hidden rounded-md py-0" data-testid={`event-group-${timeKey}`}>
      <div className="gap-1.3 flex flex-col gap-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} timeFormat={timeFormat} onClick={onClick} />
        ))}
      </div>
    </div>
  )
);

EventGroup.displayName = "EventGroup";
