"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEventCalendarStore } from "@/lib/calendar/store";
import { useShallow } from "zustand/shallow";
import { formatTimeDisplay } from "@/lib/calendar/date-utils";
import { getColorClasses, getCategoryLabel } from "@/lib/calendar/event-utils";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Music2, Users, ExternalLink, Building2, DollarSign } from "lucide-react";

function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => {
      cancelAnimationFrame(id);
      setIsMounted(false);
    };
  }, []);
  return isMounted;
}

export default function EventDetailDialog() {
  const router = useRouter();
  const { selectedEvent, isDialogOpen, closeEventDialog, timeFormat } = useEventCalendarStore(
    useShallow((state) => ({
      selectedEvent: state.selectedEvent,
      isDialogOpen: state.isDialogOpen,
      closeEventDialog: state.closeEventDialog,
      timeFormat: state.timeFormat,
    }))
  );
  const isMounted = useIsMounted();

  if (!isMounted) return null;

  const event = selectedEvent;
  const colorClasses = event ? getColorClasses(event.color) : null;

  const handleViewMore = () => {
    if (event?.shortId) {
      closeEventDialog();
      router.push(`/dashboard/events/${event.shortId}`);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={closeEventDialog} modal={true}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {colorClasses && <div className={`mt-1 h-3 w-3 rounded-full ${colorClasses.bg}`} />}
            <div className="flex-1">
              <DialogTitle className="text-lg">{event?.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {event?.status && (
                  <Badge variant="outline" className="mt-1">
                    {getCategoryLabel(event.status)}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {event && (
          <div className="space-y-4 py-2">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-medium">{format(new Date(event.startDate), "EEEE, d MMMM yyyy")}</p>
                <p className="text-muted-foreground text-sm">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatTimeDisplay(event.startTime, timeFormat)} - {formatTimeDisplay(event.endTime, timeFormat)}
                </p>
              </div>
            </div>

            {/* DJ */}
            {event.djName && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Music2 className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">DJ</p>
                    <p className="text-sm font-medium">{event.djName}</p>
                  </div>
                </div>
              </>
            )}

            {/* Venue */}
            {event.location && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Building2 className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">Venue</p>
                    <p className="text-sm font-medium">{event.location}</p>
                    {(event.venueCity || event.venueCountry) && (
                      <p className="text-muted-foreground text-xs">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {[event.venueCity, event.venueCountry].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Creator */}
            {event.creatorName && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Users className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">Created by</p>
                    <p className="text-sm font-medium">{event.creatorName}</p>
                  </div>
                </div>
              </>
            )}

            {/* Attendance */}
            {event.expectedAttendance && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <DollarSign className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">Expected Attendance</p>
                    <p className="text-sm font-medium">{event.expectedAttendance.toLocaleString()}</p>
                  </div>
                </div>
              </>
            )}

            {/* Description */}
            {event.description && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">Notes</p>
                  <p className="text-sm leading-relaxed">{event.description}</p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="mt-2 flex flex-row gap-2">
          <Button variant="outline" onClick={closeEventDialog}>
            Close
          </Button>
          {event?.shortId && (
            <Button onClick={handleViewMore} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              View More
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
