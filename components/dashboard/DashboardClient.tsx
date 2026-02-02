"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventsForCalendar } from "@/lib/actions/dashboard";
import { useEvents } from "@/lib/hooks/use-events";
import { useApprovals } from "@/lib/hooks/use-approvals";
import { useVenues } from "@/lib/hooks/use-venues";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { DashboardReportsCard } from "./DashboardReportsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, ListChecks, Building2, MapPin, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

const LIMIT = 3;

const statusLabels: Record<string, string> = {
  approved_scheduled: "Confirmed",
  approved: "Confirmed",
  pending_approval: "Pending",
  cancelled: "Canceled",
  draft: "Draft",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved_scheduled: "default",
  approved: "default",
  pending_approval: "destructive",
  cancelled: "destructive",
  draft: "secondary",
};

function UpcomingEventCard({ event }: { event: EventWithRelations }) {
  const startDate = event.starts_at ? new Date(event.starts_at) : null;
  const venueImage = event.venue?.images?.[0];
  const shortId = (event as { short_id?: string }).short_id ?? event.id;

  return (
    <Link href={`/dashboard/events/${shortId}`} className="block shrink-0 w-full">
      <Card className="overflow-hidden h-full p-0 shadow-none gap-1">
        <div className="relative h-32 bg-muted flex items-center justify-center overflow-hidden">
          {venueImage ? (
            <img src={venueImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Calendar className="h-12 w-12 text-muted-foreground" />
          )}
          <div className="absolute bottom-2 right-2">
            <Badge variant={statusVariants[event.status] ?? "secondary"} className="text-xs">
              {statusLabels[event.status] ?? event.status}
            </Badge>
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold line-clamp-2 text-sm">{event.title}</h3>
          {startDate && <p className="text-xs text-muted-foreground mt-1">{format(startDate, "EEE, MMM d, yyyy")}</p>}
          {event.venue && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.venue.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function PendingApprovalRow({
  approval,
}: {
  approval: {
    event_id: string;
    approval_type?: string;
    event?: { title?: string; starts_at?: string; short_id?: string };
  };
}) {
  const event = approval.event;
  const linkId = event?.short_id ?? approval.event_id;
  const dateStr = event?.starts_at ? format(new Date(event.starts_at), "EEE, MMM d, yyyy") : "";
  const label =
    approval.approval_type === "modification"
      ? "Modification"
      : approval.approval_type === "cancellation"
        ? "Cancellation"
        : approval.approval_type === "report"
          ? "Report Review"
          : "Pending Approval";

  return (
    <Link
      href={linkId ? `/dashboard/events/${linkId}` : "/dashboard/approvals"}
      className="flex items-center justify-between gap-3 py-3 border-b last:border-0 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{event?.title ?? "Event"}</p>
        {dateStr && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {label}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function DashboardVenueCard({ venue }: { venue: VenueWithCreator }) {
  const shortId = (venue as { short_id?: string }).short_id;
  const firstImage = venue.images?.[0];

  return (
    <Link href={shortId ? `/dashboard/venues/${shortId}/edit` : `/dashboard/venues`} className="block">
      <Card className="overflow-hidden shadow-none p-0 gap-2">
        <div className="relative h-36 bg-muted flex items-center justify-center overflow-hidden">
          {firstImage ? (
            <img src={firstImage} alt={venue.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <CardContent className="px-3 pb-2">
          <h3 className="font-semibold text-sm line-clamp-1">{venue.name}</h3>
          {(venue.city || venue.country) && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {[venue.city, venue.country].filter(Boolean).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardClient() {
  const [calendarViewingDate, setCalendarViewingDate] = useState(new Date());
  const monthStart = useMemo(() => startOfMonth(calendarViewingDate), [calendarViewingDate]);
  const monthEnd = useMemo(() => endOfMonth(calendarViewingDate), [calendarViewingDate]);

  const { data: currentEvents = [], isLoading: currentEventsLoading } = useEvents({
    status: ["approved_scheduled"],
    pageSize: LIMIT,
  });

  const { data: calendarEvents = [], isLoading: calendarLoading } = useQuery({
    queryKey: ["dashboard", "calendar", monthStart.toISOString()],
    queryFn: () => getEventsForCalendar(monthStart, monthEnd),
  });

  const { data: approvals = [], isLoading: approvalsLoading } = useApprovals();

  const { data: venuesResponse, isLoading: venuesLoading } = useVenues({ status: "active", pageSize: LIMIT });
  const venues = venuesResponse?.data ?? [];

  const displayEvents = currentEvents.slice(0, LIMIT);
  const displayApprovals = Array.isArray(approvals) ? approvals.slice(0, LIMIT) : [];
  const displayVenues = venues.slice(0, LIMIT);

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* 2 columns: left 2/3, right 1/3 */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column (2/3): Upcoming Events + Reports (one chart) */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="min-w-0 overflow-hidden">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="text-lg leading-none font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </div>

              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/events">View all</Link>
              </Button>
            </div>

            {currentEventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[200px] w-full shrink-0 rounded-lg" />
                ))}
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30">
                <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/events/requests/new">Create event</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayEvents.map((event) => (
                  <UpcomingEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          <DashboardReportsCard />
        </div>

        {/* Right column (1/3): Calendar + Pending Approvals + Venues */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="min-w-0">
            <MonthlyCalendar
              events={calendarEvents}
              isLoading={calendarLoading}
              viewingDate={calendarViewingDate}
              onViewingDateChange={setCalendarViewingDate}
              showNewEventButton
            />
          </div>

          <Card className="min-w-0 overflow-hidden p-4 shadow-none gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/approvals">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {approvalsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded" />
                  ))}
                </div>
              ) : displayApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30">
                  <ListChecks className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/dashboard/approvals">Go to approvals</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-0">
                  {displayApprovals.map(
                    (approval: {
                      id: string;
                      event_id: string;
                      approval_type?: string;
                      event?: { title?: string; starts_at?: string; short_id?: string };
                    }) => (
                      <PendingApprovalRow key={approval.id} approval={approval} />
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden p-4 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Venues
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/venues">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {venuesLoading ? (
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
                  ))}
                </div>
              ) : displayVenues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30">
                  <Building2 className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No venues yet</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/dashboard/venues/new">Add venue</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                  {displayVenues.map((venue) => (
                    <DashboardVenueCard key={venue.id} venue={venue} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
