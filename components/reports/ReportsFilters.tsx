"use client";

import { Button } from "@/components/ui/button";
import { EventCombobox } from "@/components/ui/event-combobox";
import { VenueCombobox } from "@/components/ui/venue-combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import { DjCombobox } from "@/components/ui/dj-combobox";
import { Filter, XIcon } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { format } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import type { DJ } from "@/lib/types/database.types";

export interface ReportsFiltersState {
  eventId: string | null;
  venueId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  userId: string | null;
  djId: string | null;
}

export interface UserOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  role: string;
}

export interface ReportsFiltersProps {
  filters: ReportsFiltersState;
  onFiltersChange: (f: ReportsFiltersState) => void;
  onApply: () => void;
  eventOptions: EventWithRelations[];
  venueOptions: VenueWithCreator[];
  userOptions: UserOption[];
  djOptions: DJ[];
  isLoadingEvents?: boolean;
  isLoadingVenues?: boolean;
  isLoadingUsers?: boolean;
  isLoadingDjs?: boolean;
}

export function ReportsFilters({
  filters,
  onFiltersChange,
  onApply,
  eventOptions,
  venueOptions,
  userOptions,
  djOptions,
  isLoadingEvents,
  isLoadingVenues,
  isLoadingUsers,
  isLoadingDjs,
}: ReportsFiltersProps) {
  const hasActiveFilters =
    filters.eventId || filters.venueId || filters.dateFrom || filters.dateTo || filters.userId || filters.djId;

  const handleClear = () => {
    onFiltersChange({
      eventId: null,
      venueId: null,
      dateFrom: null,
      dateTo: null,
      userId: null,
      djId: null,
    });
  };

  const dateRange =
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      : undefined;

  // const dateRangeLabel =
  //   filters.dateFrom && filters.dateTo
  //     ? `${format(new Date(filters.dateFrom), "MMM d, yyyy")} – ${format(new Date(filters.dateTo), "MMM d, yyyy")}`
  //     : filters.dateFrom
  //       ? format(new Date(filters.dateFrom), "MMM d, yyyy")
  //       : null;

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        </div>
        <div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-xs">
              <XIcon className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
          <Button onClick={onApply}>Apply</Button>
        </div>
      </div>

      <div className="flex w-full flex-wrap gap-4">
        <div className="min-w-full space-y-2 sm:min-w-[calc(50%-0.5rem)] sm:flex-1 sm:basis-0 lg:min-w-[calc(23%-0.8rem)]">
          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Date range"
            label="Date range"
          />
        </div>

        <div className="min-w-full sm:min-w-[calc(50%-0.5rem)] sm:flex-1 sm:basis-0 lg:min-w-[calc(20%-0.8rem)]">
          <EventCombobox
            label="Event"
            value={filters.eventId}
            onValueChange={(v) => onFiltersChange({ ...filters, eventId: v })}
            options={eventOptions.map((e) => ({ id: e.id, title: e.title }))}
            placeholder="All events"
            loading={isLoadingEvents}
          />
        </div>

        <div className="min-w-full sm:min-w-[calc(50%-0.5rem)] sm:flex-1 sm:basis-0 lg:min-w-[calc(20%-0.8rem)]">
          <VenueCombobox
            label="Venue"
            value={filters.venueId}
            onValueChange={(v) => onFiltersChange({ ...filters, venueId: v })}
            options={venueOptions.map((v) => ({ id: v.id, name: v.name }))}
            placeholder="All venues"
            loading={isLoadingVenues}
          />
        </div>

        <div className="min-w-full sm:min-w-[calc(50%-0.5rem)] sm:flex-1 sm:basis-0 lg:min-w-[calc(20%-0.8rem)]">
          <UserCombobox
            label="User"
            value={filters.userId}
            onValueChange={(v) => onFiltersChange({ ...filters, userId: v })}
            options={userOptions}
            placeholder="All users"
            loading={isLoadingUsers}
          />
        </div>

        <div className="min-w-full sm:min-w-[calc(50%-0.5rem)] sm:flex-1 sm:basis-0 lg:min-w-[calc(17%-0.8rem)]">
          <DjCombobox
            label="DJ"
            value={filters.djId}
            onValueChange={(v) => onFiltersChange({ ...filters, djId: v })}
            options={djOptions.map((dj) => ({
              id: dj.id,
              name: dj.name,
              email: dj.email,
              music_style: dj.music_style,
            }))}
            placeholder="All DJs"
            loading={isLoadingDjs}
          />
        </div>
      </div>
    </div>
  );
}
