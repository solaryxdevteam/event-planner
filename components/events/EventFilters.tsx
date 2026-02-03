/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { XIcon, SearchIcon } from "lucide-react";
import { format } from "date-fns";

// Debounce function
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export interface EventFilters {
  search: string;
  status: string; // "all" or specific status
  dateFrom: string | null; // ISO date string
  dateTo: string | null; // ISO date string
  creatorId: string | null;
  venueId: string | null;
  state: string | null; // "all" or state name (filter by venue state)
}

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  availableCreators: Array<{ id: string; name: string }>;
  availableVenues: Array<{ id: string; name: string }>;
  availableStates: string[];
}

const eventStatuses = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved_scheduled", label: "Approved - Scheduled" },
  { value: "completed_awaiting_report", label: "Completed - Awaiting Report" },
  { value: "completed_archived", label: "Completed - Archived" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function EventFilters({
  filters,
  onFiltersChange,
  availableCreators,
  availableVenues,
  availableStates,
}: EventFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounced search handler
  const debouncedSearch = useRef(
    debounce((value: string) => {
      onFiltersChange({ ...filters, search: value });
    }, 500)
  ).current;

  // Update local search value when filters.search changes externally
  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleSearchClear = () => {
    setSearchValue("");
    onFiltersChange({ ...filters, search: "" });
  };

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange({
      search: "",
      status: "all",
      dateFrom: null,
      dateTo: null,
      creatorId: null,
      venueId: null,
      state: "all",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.creatorId ||
    filters.venueId ||
    (filters.state && filters.state !== "all");

  const dateRangeValue =
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      : undefined;

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filters</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={handleSearchClear}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Event Date Range</Label>
          <DateRangePicker value={dateRangeValue} onChange={handleDateRangeChange} placeholder="Select date range" />
        </div>

        {/* Creator Filter */}
        {availableCreators.length > 0 && (
          <div className="space-y-2">
            <Label>Creator</Label>
            <Select
              value={filters.creatorId || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, creatorId: value === "all" ? null : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {availableCreators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Venue Filter */}
        {availableVenues.length > 0 && (
          <div className="space-y-2">
            <Label>Venue</Label>
            <Select
              value={filters.venueId || "all"}
              onValueChange={(value) => onFiltersChange({ ...filters, venueId: value === "all" ? null : value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {availableVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* State Filter - Filter by venue state */}
        {availableStates.length > 0 && (
          <div className="space-y-2">
            <Label>State</Label>
            <LocationCombobox
              value={filters.state && filters.state !== "all" ? filters.state : undefined}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  onFiltersChange({ ...filters, state: "all" });
                } else {
                  onFiltersChange({ ...filters, state: value });
                }
              }}
              options={availableStates.map((state) => ({ id: state, name: state }))}
              placeholder="All States"
              label=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
