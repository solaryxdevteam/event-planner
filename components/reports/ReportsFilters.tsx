"use client";

import { Button } from "@/components/ui/button";
import { EventCombobox } from "@/components/ui/event-combobox";
import { VenueCombobox } from "@/components/ui/venue-combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import { DjCombobox } from "@/components/ui/dj-combobox";
import { Filter, XIcon } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg sm:border bg-card p-1 sm:p-3 sm:p-4 sm:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-xs">
            <XIcon className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
        <EventCombobox
          label="Event"
          value={filters.eventId}
          onValueChange={(v) => onFiltersChange({ ...filters, eventId: v })}
          options={eventOptions.map((e) => ({ id: e.id, title: e.title }))}
          placeholder="All events"
          loading={isLoadingEvents}
        />

        <VenueCombobox
          label="Venue"
          value={filters.venueId}
          onValueChange={(v) => onFiltersChange({ ...filters, venueId: v })}
          options={venueOptions.map((v) => ({ id: v.id, name: v.name }))}
          placeholder="All venues"
          loading={isLoadingVenues}
        />

        <UserCombobox
          label="User"
          value={filters.userId}
          onValueChange={(v) => onFiltersChange({ ...filters, userId: v })}
          options={userOptions}
          placeholder="All users"
          loading={isLoadingUsers}
        />

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

        <div className="space-y-2">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Date range"
            label="Date range"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={onApply} className="w-full sm:w-auto">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
