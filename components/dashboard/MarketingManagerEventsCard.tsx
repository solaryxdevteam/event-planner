"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Calendar, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useEvents } from "@/lib/hooks/use-events";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

const LIMIT = 5;

function EventRow({ event }: { event: EventWithRelations }) {
  const shortId = (event as { short_id?: string }).short_id ?? event.id;
  const dateStr = event.starts_at ? format(new Date(event.starts_at), "EEE, MMM d, yyyy") : "";

  return (
    <Link
      href={`/dashboard/events/${shortId}`}
      className="flex items-center justify-between gap-3 py-3 border-b last:border-0 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{event.title}</p>
        {dateStr && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </p>
        )}
        {event.venue && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.venue.name}</span>
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

/**
 * Shows approved events that do not yet have a marketing report and need one from the marketing manager.
 */
export function MarketingManagerEventsCard() {
  const { data, isLoading } = useEvents({
    status: ["approved_scheduled"],
    needsMarketingReport: true,
    pageSize: LIMIT,
  });
  const events = data?.events ?? [];
  const displayEvents = events.slice(0, LIMIT);

  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-4 shadow-none gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 gap-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
          Need Marketing Report
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/dashboard/events">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded" />
            ))}
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30">
            <Megaphone className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No approved events need a marketing report</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/events">View events</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {displayEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
