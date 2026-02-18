"use client";

import { useState, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventCalendar } from "@/components/calendar/event-calendar/event-calendar";
import type { CalendarFilters } from "@/components/calendar/event-calendar/calendar-filters";
import { mapEventsToCalendarEvents } from "@/lib/calendar/map-events";
import { apiClient } from "@/lib/services/client/api-client";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { parseAsIsoDate } from "nuqs/server";
import { useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useActiveDjs } from "@/lib/hooks/use-djs";
import { useVenues } from "@/lib/hooks/use-venues";

function CalendarContent() {
  const [date] = useQueryState("date", parseAsIsoDate.withDefault(new Date()));

  const [filters, setFilters] = useState<CalendarFilters>({
    djIds: [],
    countries: [],
    city: "",
    statuses: [],
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => apiClient.get<EventWithRelations[]>("/api/calendar"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: activeDjs = [] } = useActiveDjs();
  const { data: venuesResult } = useVenues({ pageSize: 500, page: 1 });

  const allDjs = useMemo(() => activeDjs.map((d) => ({ id: d.id, name: d.name })), [activeDjs]);

  const allCountries = useMemo(() => {
    const set = new Set<string>();
    (venuesResult?.data ?? []).forEach((v) => {
      const country = v.country ?? v.country_location?.name;
      if (country && String(country).trim()) set.add(String(country).trim());
    });
    return Array.from(set).sort();
  }, [venuesResult?.data]);

  const calendarEvents = useMemo(() => mapEventsToCalendarEvents(events), [events]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 py-4">
        <div className="px-2">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Calendar</h1>
            <p className="text-muted-foreground mt-1">View all events, DJs, and venues on the calendar.</p>
          </div>
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            {isLoading ? (
              <div className="flex h-[700px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
                  <p className="text-muted-foreground text-sm">Loading calendar...</p>
                </div>
              </div>
            ) : (
              <EventCalendar
                events={calendarEvents}
                initialDate={date}
                filters={filters}
                onFiltersChange={setFilters}
                allDjs={allDjs}
                allCountries={allCountries}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[700px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
            <p className="text-muted-foreground text-sm">Loading calendar...</p>
          </div>
        </div>
      }
    >
      <NuqsAdapter>
        <CalendarContent />
      </NuqsAdapter>
    </Suspense>
  );
}
