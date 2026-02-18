"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { EventsList } from "./event-list";
import { EventCalendarDay } from "./event-calendar-day";
import { EventCalendarWeek } from "./event-calendar-week";
import EventDetailDialog from "./event-detail-dialog";
import { useEventCalendarStore } from "@/lib/calendar/store";
import { EventCalendarMonth } from "./event-calendar-month";
import { MonthDayEventsDialog } from "./day-events-dialog";
import { useShallow } from "zustand/shallow";
import { useMemo } from "react";
import { EventCalendarYear } from "./event-calendar-year";
import { EventCalendarDays } from "./event-calendar-days";
import CalendarToolbar from "./calendar-toolbar";
import { CalendarFiltersBar, type CalendarFilters, type DjOption } from "./calendar-filters";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NEW_EVENT_REQUEST_PATH = "/dashboard/events/requests/new";

interface EventCalendarProps {
  events: CalendarEvent[];
  initialDate: Date;
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  allDjs?: DjOption[];
  allCountries?: string[];
}

export function EventCalendar({
  initialDate,
  events,
  filters,
  onFiltersChange,
  allDjs,
  allCountries,
}: EventCalendarProps) {
  const router = useRouter();
  const { viewMode, currentView, daysCount, addEventConfirmDialog, closeAddEventConfirmDialog } = useEventCalendarStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      currentView: state.currentView,
      daysCount: state.daysCount,
      addEventConfirmDialog: state.addEventConfirmDialog,
      closeAddEventConfirmDialog: state.closeAddEventConfirmDialog,
    }))
  );

  const filteredEvents = useMemo(() => {
    let result = events;

    if (filters.djIds.length > 0) {
      result = result.filter((e) => e.djId && filters.djIds.includes(e.djId));
    }

    if (filters.countries.length > 0) {
      result = result.filter((e) => e.venueCountry && filters.countries.includes(e.venueCountry));
    }

    if (filters.city.trim()) {
      const cityQuery = filters.city.trim().toLowerCase();
      result = result.filter((e) => e.venueCity && e.venueCity.toLowerCase().includes(cityQuery));
    }

    if (filters.statuses.length > 0) {
      result = result.filter((e) => e.status && filters.statuses.includes(e.status));
    }

    return result;
  }, [events, filters]);

  const renderCalendarView = useMemo(() => {
    if (viewMode === "list") {
      return <EventsList events={filteredEvents} currentDate={initialDate} />;
    }
    switch (currentView) {
      case "day":
        return <EventCalendarDay events={filteredEvents} currentDate={initialDate} />;
      case "days":
        return <EventCalendarDays events={filteredEvents} daysCount={daysCount} currentDate={initialDate} />;
      case "week":
        return <EventCalendarWeek events={filteredEvents} currentDate={initialDate} />;
      case "month":
        return <EventCalendarMonth events={filteredEvents} baseDate={initialDate} />;
      case "year":
        return <EventCalendarYear events={filteredEvents} currentDate={initialDate} />;
      default:
        return <EventCalendarMonth events={filteredEvents} baseDate={initialDate} />;
    }
  }, [currentView, daysCount, filteredEvents, initialDate, viewMode]);

  const handleAddEventConfirm = () => {
    closeAddEventConfirmDialog();
    const date = addEventConfirmDialog.date;
    const path = date ? `${NEW_EVENT_REQUEST_PATH}?date=${format(date, "yyyy-MM-dd")}` : NEW_EVENT_REQUEST_PATH;
    router.push(path);
  };

  return (
    <>
      <EventDetailDialog />
      <MonthDayEventsDialog />
      <AlertDialog open={addEventConfirmDialog.open} onOpenChange={(open) => !open && closeAddEventConfirmDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new event request?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be taken to the event request form to create a new event. You can save a draft or submit for
              approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddEventConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="bg-background overflow-hidden rounded-xl border shadow-sm">
        <CalendarToolbar />
        <CalendarFiltersBar
          events={events}
          filters={filters}
          onFiltersChange={onFiltersChange}
          allDjs={allDjs}
          allCountries={allCountries}
        />
        <div className="overflow-hidden p-0">{renderCalendarView}</div>
      </div>
    </>
  );
}
