"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEventCalendarStore } from "@/lib/calendar/store";
import { formatDate } from "@/lib/calendar/date-utils";
import { useMemo } from "react";
import { CalendarEvent, TimeFormatType } from "@/lib/calendar/types";
import { EventCard } from "./ui/events";
import { getLocaleFromCode } from "@/lib/calendar/event-utils";
import { useShallow } from "zustand/shallow";
import { Plus } from "lucide-react";

const EmptyState = () => (
  <div className="text-muted-foreground py-12 text-center">No events scheduled for this date</div>
);

const EventListContent = ({
  events,
  timeFormat,
  onEventClick,
}: {
  events: CalendarEvent[];
  timeFormat: TimeFormatType;
  onEventClick: (event: CalendarEvent) => void;
}) => (
  <ScrollArea className="h-[400px] w-full rounded-md">
    <div className="flex flex-col gap-2">
      {events.length > 0 ? (
        events.map((event) => <EventCard key={event.id} event={event} timeFormat={timeFormat} onClick={onEventClick} />)
      ) : (
        <EmptyState />
      )}
    </div>
  </ScrollArea>
);

export function MonthDayEventsDialog() {
  const {
    openEventDialog,
    closeDayEventsDialog,
    timeFormat,
    dayEventsDialog,
    locale,
    isDialogOpen,
    openAddEventConfirmDialog,
  } = useEventCalendarStore(
    useShallow((state) => ({
      openEventDialog: state.openEventDialog,
      closeDayEventsDialog: state.closeDayEventsDialog,
      timeFormat: state.timeFormat,
      dayEventsDialog: state.dayEventsDialog,
      locale: state.locale,
      isDialogOpen: state.isDialogOpen,
      openAddEventConfirmDialog: state.openAddEventConfirmDialog,
    }))
  );
  const localeObj = getLocaleFromCode(locale);

  const formattedDate = useMemo(
    () =>
      dayEventsDialog.date &&
      formatDate(dayEventsDialog.date, "EEEE, d MMMM yyyy", {
        locale: localeObj,
      }),
    [dayEventsDialog.date, localeObj]
  );

  const handleOpenChange = (open: boolean) => {
    if (!open && !isDialogOpen) closeDayEventsDialog();
  };

  return (
    <Dialog open={dayEventsDialog.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader className="mb-4">
          <DialogTitle>Events {formattedDate && <span>{formattedDate}</span>}</DialogTitle>
          <DialogDescription>List of all events scheduled for this date</DialogDescription>
        </DialogHeader>
        <EventListContent events={dayEventsDialog.events} timeFormat={timeFormat} onEventClick={openEventDialog} />
        <DialogFooter className="">
          <Button variant="outline" onClick={closeDayEventsDialog}>
            Close
          </Button>
          <Button onClick={() => dayEventsDialog.date && openAddEventConfirmDialog(dayEventsDialog.date)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
