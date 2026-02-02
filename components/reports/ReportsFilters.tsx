"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EventCombobox } from "@/components/ui/event-combobox";
import { VenueCombobox } from "@/components/ui/venue-combobox";
import { Filter, XIcon } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

export interface ReportsFiltersState {
  eventId: string | null;
  venueId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortByNetProfit: "asc" | "desc" | null;
}

export interface ReportsFiltersProps {
  filters: ReportsFiltersState;
  onFiltersChange: (f: ReportsFiltersState) => void;
  onApply: () => void;
  eventOptions: EventWithRelations[];
  venueOptions: VenueWithCreator[];
  isLoadingEvents?: boolean;
  isLoadingVenues?: boolean;
}

const SORT_OPTIONS: { value: "asc" | "desc" | "__default__"; label: string }[] = [
  { value: "__default__", label: "Default" },
  { value: "desc", label: "Net profit: High to low" },
  { value: "asc", label: "Net profit: Low to high" },
];

export function ReportsFilters({
  filters,
  onFiltersChange,
  onApply,
  eventOptions,
  venueOptions,
  isLoadingEvents,
  isLoadingVenues,
}: ReportsFiltersProps) {
  const hasActiveFilters =
    filters.eventId || filters.venueId || filters.dateFrom || filters.dateTo || filters.sortByNetProfit;

  const handleClear = () => {
    onFiltersChange({
      eventId: null,
      venueId: null,
      dateFrom: null,
      dateTo: null,
      sortByNetProfit: null,
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
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="space-y-2">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Date range"
            label="Date range"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Sort by net profit</label>
          <Select
            value={filters.sortByNetProfit ?? "__default__"}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                sortByNetProfit: v === "asc" || v === "desc" ? v : null,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__default__"} value={opt.value || "__default__"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
