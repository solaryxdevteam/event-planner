"use client";

import type { ChangeEvent, ChangeEventHandler } from "react";
import { useMemo, useState, useRef } from "react";
import { format } from "date-fns";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string | null;
  status: string;
  shortId: string;
}

interface MonthlyCalendarProps {
  events?: CalendarEvent[];
  isLoading?: boolean;
  /** Controlled: current viewing month. When set, parent can refetch when month changes. */
  viewingDate?: Date;
  onViewingDateChange?: (date: Date) => void;
  /** Show "New Event" button below calendar */
  showNewEventButton?: boolean;
}

function handleCalendarChange(value: string | number, onChange: ChangeEventHandler<HTMLSelectElement> | undefined) {
  if (!onChange) return;
  const syntheticEvent = {
    target: { value: String(value) },
  } as ChangeEvent<HTMLSelectElement>;
  onChange(syntheticEvent);
}

export function MonthlyCalendar({
  events = [],
  isLoading = false,
  viewingDate: controlledDate,
  onViewingDateChange,
  showNewEventButton = false,
}: MonthlyCalendarProps) {
  const router = useRouter();
  const [internalDate, setInternalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date | undefined>(undefined);
  const anchorRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const month = controlledDate ?? internalDate;
  const setMonth = (d: Date) => {
    if (onViewingDateChange) onViewingDateChange(d);
    else setInternalDate(d);
  };

  /** Days that have at least one event (for "booked" modifier) */
  const bookedDays = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((event) => {
      dates.add(format(new Date(event.date), "yyyy-MM-dd"));
    });
    return Array.from(dates).map((d) => new Date(d + "T12:00:00"));
  }, [events]);

  const modifiers = useMemo(
    () => ({
      booked: bookedDays,
    }),
    [bookedDays]
  );

  const modifiersClassNames = useMemo(
    () => ({
      booked: "rounded-full bg-red-500 text-white !font-bold",
    }),
    []
  );

  // Filter events for the clicked date and count current/upcoming events
  const dayEvents = useMemo(() => {
    if (!clickedDate) return [];
    const dayStr = format(clickedDate, "yyyy-MM-dd");

    return events.filter((event) => {
      const eventDate = new Date(event.date);
      const eventDateStr = format(eventDate, "yyyy-MM-dd");
      return eventDateStr === dayStr;
    });
  }, [clickedDate, events]);

  // Count current/upcoming events (approved_scheduled status)
  // "Current/upcoming" refers to events with approved_scheduled status
  const currentUpcomingCount = useMemo(() => {
    if (!clickedDate) return 0;

    // Count approved_scheduled events on the clicked day
    return dayEvents.filter((event) => {
      return event.status === "approved_scheduled";
    }).length;
  }, [dayEvents, clickedDate]);

  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      setClickedDate(date);
      setSelectedDate(date);

      // Position anchor and open popover after a short delay to ensure DOM is updated
      setTimeout(() => {
        if (calendarRef.current && anchorRef.current) {
          // Find the selected day button
          const dayButton = calendarRef.current.querySelector(`button[data-selected-single="true"]`) as HTMLElement;

          if (dayButton) {
            const rect = dayButton.getBoundingClientRect();
            const calendarRect = calendarRef.current.getBoundingClientRect();
            anchorRef.current.style.position = "absolute";
            anchorRef.current.style.left = `${rect.left - calendarRect.left + rect.width / 2}px`;
            anchorRef.current.style.top = `${rect.bottom - calendarRect.top + 4}px`;
            anchorRef.current.style.width = "1px";
            anchorRef.current.style.height = "1px";
          }
          setPopoverOpen(true);
        }
      }, 10);
    } else {
      setPopoverOpen(false);
      setSelectedDate(undefined);
    }
  };

  const handleViewEvents = () => {
    if (!clickedDate) return;
    const dateStr = format(clickedDate, "yyyy-MM-dd");
    router.push(`/dashboard/events?tab=current&dateFrom=${dateStr}&dateTo=${dateStr}`);
    setPopoverOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="min-w-0 flex flex-col h-full overflow-hidden p-4 gap-0">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-7 gap-1 min-w-0">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square min-h-[32px] w-full rounded-full" />
          ))}
        </div>
        {showNewEventButton && (
          <div className="mt-4 pt-4 border-t">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}
      </Card>
    );
  }

  const DropdownSelect = (props: {
    value?: number | string | readonly string[];
    onChange?: ChangeEventHandler<HTMLSelectElement>;
    options?: Array<{ value: number; label: string; disabled: boolean }>;
  }) => {
    const raw = props.value;
    const numValue =
      typeof raw === "number" ? raw : raw === undefined ? undefined : Number(Array.isArray(raw) ? raw[0] : raw);
    return (
      <Select
        onValueChange={(val) => handleCalendarChange(Number(val), props.onChange)}
        value={numValue !== undefined ? String(numValue) : undefined}
      >
        <SelectTrigger className="flex-1 min-w-0 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options?.map((option) => (
            <SelectItem disabled={option.disabled} key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Card className="min-w-0 px-4 pb-4 pt-2 flex flex-col h-full overflow-hidden shadow-none gap-0">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <div
          ref={calendarRef}
          className="relative [&_.rdp-day]:rounded-full [&_.rdp-day_button]:rounded-full [&_.rdp-today]:rounded-full calendar-dashboard"
        >
          <CalendarUi
            captionLayout="dropdown"
            className="rounded-md border-0 px-1 pt-0 pb-1 w-full"
            components={{
              MonthCaption: (props) => <>{props.children}</>,
              DropdownNav: (props) => (
                <div className="flex w-full items-center gap-4 mt-2 mb-1 px-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      const d = new Date(month);
                      d.setMonth(d.getMonth() - 1);
                      setMonth(d);
                    }}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {props.children}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      const d = new Date(month);
                      d.setMonth(d.getMonth() + 1);
                      setMonth(d);
                    }}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ),
              MonthsDropdown: DropdownSelect,
              YearsDropdown: DropdownSelect,
            }}
            hideNavigation
            mode="single"
            month={month}
            onMonthChange={setMonth}
            onSelect={handleDayClick}
            selected={selectedDate}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            showOutsideDays
          />
          <PopoverAnchor ref={anchorRef} className="invisible w-0 h-0" />
        </div>
        {clickedDate && (
          <PopoverContent className="w-64" align="start" side="bottom">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1">{format(clickedDate, "EEEE, MMMM d, yyyy")}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentUpcomingCount === 0
                    ? "No upcoming events"
                    : `${currentUpcomingCount} ${currentUpcomingCount === 1 ? "event" : "events"}`}
                </p>
              </div>
              {currentUpcomingCount > 0 && (
                <Button onClick={handleViewEvents} className="w-full" size="sm">
                  View Events
                </Button>
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>

      {showNewEventButton && (
        <div className="pt-4 border-t">
          <Button asChild className="w-full" size="default">
            <Link href="/dashboard/events/requests/new">+ New Event</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
