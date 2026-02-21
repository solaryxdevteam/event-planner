"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventsForCalendar } from "@/lib/actions/dashboard";
import { useEvents } from "@/lib/hooks/use-events";
import { useApprovals, useVenueApprovals } from "@/lib/hooks/use-approvals";
import { useVenues } from "@/lib/hooks/use-venues";
import { useProfile } from "@/lib/hooks/use-profile";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { DashboardReportsCard } from "./DashboardReportsCard";
import { PendingApprovalsCard } from "./PendingApprovalsCard";
import { AwaitingReportEventsCard } from "./AwaitingReportEventsCard";
import { MarketingManagerEventsCard } from "./MarketingManagerEventsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Building2, MapPin } from "lucide-react";

import { format, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { UserRole } from "@/lib/types/roles";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

const LIMIT = 6;

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
  const venueImage = event.venue?.media?.[0]?.url;
  const shortId = (event as { short_id?: string }).short_id ?? event.id;

  return (
    <Link href={`/dashboard/events/${shortId}`} className="block shrink-0 w-full">
      <Card className="overflow-hidden h-full p-0 shadow-none gap-1">
        <div className="relative h-48 bg-muted flex items-center justify-center overflow-hidden">
          {venueImage ? (
            <Image src={venueImage} alt="" fill className="object-cover" unoptimized />
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
          <h3 className="font-semibold line-clamp-2 text-sm mb-3">{event.title}</h3>
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

/** Single row for an event approval in the dashboard pending list */
function DashboardVenueCard({ venue }: { venue: VenueWithCreator }) {
  const shortId = (venue as { short_id?: string }).short_id;
  const media = venue.media && Array.isArray(venue.media) ? venue.media : [];
  const cover =
    media.find((m: { isCover?: boolean; type?: string }) => m.isCover && m.type === "photo") ||
    media.find((m: { type?: string }) => m.type === "photo");
  const coverUrl = cover && typeof cover.url === "string" ? cover.url : null;

  return (
    <Link href={shortId ? `/dashboard/venues/${shortId}/edit` : `/dashboard/venues`} className="block">
      <Card className="overflow-hidden shadow-none p-0 gap-2">
        <div className="relative h-36 bg-muted flex items-center justify-center overflow-hidden">
          {coverUrl ? (
            <Image src={coverUrl} alt={venue.name} fill className="object-cover" unoptimized />
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

  const { data: profile } = useProfile();
  const isEventPlanner = profile?.role === UserRole.EVENT_PLANNER;
  const isMarketingManager = profile?.role === UserRole.MARKETING_MANAGER;
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  const { data: currentEvents = [], isLoading: currentEventsLoading } = useEvents({
    status: ["approved_scheduled"],
    pageSize: LIMIT,
  });

  const { data: calendarEvents = [], isLoading: calendarLoading } = useQuery({
    queryKey: ["dashboard", "calendar", monthStart.toISOString()],
    queryFn: () => getEventsForCalendar(monthStart, monthEnd),
  });

  const { data: eventApprovals = [], isLoading: eventApprovalsLoading } = useApprovals({
    approval_type: "event",
  });
  const { data: modificationApprovals = [], isLoading: modificationLoading } = useApprovals({
    approval_type: "modification",
  });
  const { data: cancellationApprovals = [], isLoading: cancellationLoading } = useApprovals({
    approval_type: "cancellation",
  });
  const { data: reportApprovals = [], isLoading: reportLoading } = useApprovals({
    approval_type: "report",
  });
  const { data: venueApprovals = [], isLoading: venueApprovalsLoading } = useVenueApprovals();

  const approvalsLoading =
    eventApprovalsLoading || modificationLoading || cancellationLoading || reportLoading || venueApprovalsLoading;

  // Combined list: event approvals (with type) + venue approvals, sorted by created_at desc, then slice
  const displayApprovals = useMemo(() => {
    type EventApprovalItem = {
      type: "event";
      id: string;
      event_id: string;
      approval_type: string;
      event?: { title?: string; starts_at?: string; short_id?: string; created_at?: string };
      created_at?: string;
    };
    type VenueApprovalItem = {
      type: "venue";
      id: string;
      venue_id: string;
      venue?: { name?: string; short_id?: string; city?: string; country?: string; created_at?: string };
      created_at?: string;
    };
    const eventItems: EventApprovalItem[] = [
      ...(Array.isArray(eventApprovals) ? eventApprovals : []).map(
        (a: { id: string; event_id: string; approval_type?: string; event?: unknown; created_at?: string }) => ({
          type: "event" as const,
          id: a.id,
          event_id: a.event_id,
          approval_type: a.approval_type ?? "event",
          event: a.event as EventApprovalItem["event"],
          created_at: a.created_at ?? (a.event as { created_at?: string })?.created_at,
        })
      ),
      ...(Array.isArray(modificationApprovals) ? modificationApprovals : []).map(
        (a: { id: string; event_id: string; approval_type?: string; event?: unknown; created_at?: string }) => ({
          type: "event" as const,
          id: a.id,
          event_id: a.event_id,
          approval_type: "modification",
          event: a.event as EventApprovalItem["event"],
          created_at: a.created_at ?? (a.event as { created_at?: string })?.created_at,
        })
      ),
      ...(Array.isArray(cancellationApprovals) ? cancellationApprovals : []).map(
        (a: { id: string; event_id: string; event?: unknown; created_at?: string }) => ({
          type: "event" as const,
          id: a.id,
          event_id: a.event_id,
          approval_type: "cancellation",
          event: a.event as EventApprovalItem["event"],
          created_at: a.created_at ?? (a.event as { created_at?: string })?.created_at,
        })
      ),
      ...(Array.isArray(reportApprovals) ? reportApprovals : []).map(
        (a: { id: string; event_id: string; event?: unknown; created_at?: string }) => ({
          type: "event" as const,
          id: a.id,
          event_id: a.event_id,
          approval_type: "report",
          event: a.event as EventApprovalItem["event"],
          created_at: a.created_at ?? (a.event as { created_at?: string })?.created_at,
        })
      ),
    ];
    const venueItems: VenueApprovalItem[] = (Array.isArray(venueApprovals) ? venueApprovals : []).map(
      (a: { id: string; venue_id: string; venue?: unknown; created_at?: string }) => ({
        type: "venue" as const,
        id: a.id,
        venue_id: a.venue_id,
        venue: a.venue as VenueApprovalItem["venue"],
        created_at: a.created_at ?? (a.venue as { created_at?: string })?.created_at,
      })
    );
    const combined: (EventApprovalItem | VenueApprovalItem)[] = [...eventItems, ...venueItems];
    combined.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    return combined.slice(0, LIMIT);
  }, [eventApprovals, modificationApprovals, cancellationApprovals, reportApprovals, venueApprovals]);

  const { data: venuesResponse, isLoading: venuesLoading } = useVenues({ status: "active", pageSize: LIMIT });
  const venues = venuesResponse?.data ?? [];

  const displayEvents = currentEvents.slice(0, LIMIT);
  const displayVenues = venues.slice(0, 2);

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* 2 columns: left 2/3, right 1/3 */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column (2/3): Upcoming Events + Reports (one chart) */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0 overflow-hidden shadow-none gap-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0 gap-2">
              <div className="text-base sm:text-lg leading-none font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Upcoming Events
              </div>

              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/dashboard/events">View all</Link>
              </Button>
            </CardHeader>

            <CardContent className="py-0 px-4">
              {currentEventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[290px] w-full shrink-0 rounded-lg" />
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
            </CardContent>
          </Card>

          {isGlobalDirector && <DashboardReportsCard />}
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

          {!isEventPlanner && !isMarketingManager && (
            <PendingApprovalsCard approvals={displayApprovals} isLoading={approvalsLoading} />
          )}

          {isEventPlanner && <AwaitingReportEventsCard />}

          {isMarketingManager && <MarketingManagerEventsCard />}

          <Card className="min-w-0 overflow-hidden p-3 sm:p-4 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 gap-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Venues
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/dashboard/venues">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {venuesLoading ? (
                <div className="grid min-w-0 grid-cols-1 gap-4">
                  {[1, 2].map((i) => (
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
                <div className="grid gap-4 grid-cols-1">
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
