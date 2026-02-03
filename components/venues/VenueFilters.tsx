/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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

export interface VenueFilters {
  search: string;
  state: string | null; // "all" or state name
  status: "active" | "banned" | "all";
  specs: string[]; // ["sound", "lights", "screens"]
  dateFrom: string | null; // ISO date string
  dateTo: string | null; // ISO date string
  standingMin: number | null;
  standingMax: number | null;
  seatedMin: number | null;
  seatedMax: number | null;
}

interface VenueFiltersProps {
  filters: VenueFilters;
  onFiltersChange: (filters: VenueFilters) => void;
  availableStates: string[];
  maxDate?: Date;
  minStanding?: number;
  maxStanding?: number;
  minSeated?: number;
  maxSeated?: number;
}

export function VenueFilters({
  filters,
  onFiltersChange,
  availableStates,
  maxDate,
  minStanding = 0,
  maxStanding = 1000000,
  minSeated = 0,
  maxSeated = 1000000,
}: VenueFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [standingRange, setStandingRange] = useState<[number, number]>([
    filters.standingMin ?? minStanding,
    filters.standingMax ?? maxStanding,
  ]);
  const [seatedRange, setSeatedRange] = useState<[number, number]>([
    filters.seatedMin ?? minSeated,
    filters.seatedMax ?? maxSeated,
  ]);

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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      // Clear any pending debounced calls
    };
  }, []);

  // Update ranges when min/max values change
  React.useEffect(() => {
    setStandingRange([filters.standingMin ?? minStanding, filters.standingMax ?? maxStanding]);
  }, [filters.standingMin, filters.standingMax, minStanding, maxStanding]);

  React.useEffect(() => {
    setSeatedRange([filters.seatedMin ?? minSeated, filters.seatedMax ?? maxSeated]);
  }, [filters.seatedMin, filters.seatedMax, minSeated, maxSeated]);

  const handleStandingRangeChange = (values: number[]) => {
    if (values.length === 2) {
      setStandingRange([values[0], values[1]]);
      onFiltersChange({
        ...filters,
        standingMin: values[0] === minStanding ? null : values[0],
        standingMax: values[1] === maxStanding ? null : values[1],
      });
    }
  };

  const handleSeatedRangeChange = (values: number[]) => {
    if (values.length === 2) {
      setSeatedRange([values[0], values[1]]);
      onFiltersChange({
        ...filters,
        seatedMin: values[0] === minSeated ? null : values[0],
        seatedMax: values[1] === maxSeated ? null : values[1],
      });
    }
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleSpecToggle = (spec: string) => {
    const newSpecs = filters.specs.includes(spec) ? filters.specs.filter((s) => s !== spec) : [...filters.specs, spec];
    onFiltersChange({ ...filters, specs: newSpecs });
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
      state: "all",
      status: "all",
      specs: [],
      dateFrom: null,
      dateTo: null,
      standingMin: null,
      standingMax: null,
      seatedMin: null,
      seatedMax: null,
    });
    setStandingRange([minStanding, maxStanding]);
    setSeatedRange([minSeated, maxSeated]);
  };

  const hasActiveFilters =
    filters.search ||
    filters.state !== "all" ||
    filters.status !== "all" ||
    filters.specs.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.standingMin !== null ||
    filters.standingMax !== null ||
    filters.seatedMin !== null ||
    filters.seatedMax !== null;

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
            placeholder="Search by name or city..."
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
        {/* State Filter - Combobox */}
        <div className="space-y-2">
          <Label>State</Label>
          <LocationCombobox
            value={filters.state && filters.state !== "all" ? filters.state : undefined}
            onValueChange={(value) => {
              if (value === "all" || !value) {
                onFiltersChange({ ...filters, state: "all" });
              } else {
                onFiltersChange({ ...filters, state: value });
              }
            }}
            options={[...availableStates.map((state) => ({ id: state, name: state }))]}
            placeholder="All States"
            label=""
          />
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value as "active" | "banned" | "all" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Technical Specs Filter */}
        <div className="space-y-2">
          <Label>Technical Specs</Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spec-sound"
                checked={filters.specs.includes("sound")}
                onCheckedChange={() => handleSpecToggle("sound")}
              />
              <Label htmlFor="spec-sound" className="font-normal cursor-pointer text-sm">
                Sound
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spec-lights"
                checked={filters.specs.includes("lights")}
                onCheckedChange={() => handleSpecToggle("lights")}
              />
              <Label htmlFor="spec-lights" className="font-normal cursor-pointer text-sm">
                Lights
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spec-screens"
                checked={filters.specs.includes("screens")}
                onCheckedChange={() => handleSpecToggle("screens")}
              />
              <Label htmlFor="spec-screens" className="font-normal cursor-pointer text-sm">
                Screens
              </Label>
            </div>
          </div>
        </div>

        {/* Date Range Filter - Calendar */}
        {maxDate && (
          <div className="space-y-2">
            <Label>Availability Date Range</Label>
            <DateRangePicker
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              min={(() => {
                const date = new Date();
                date.setFullYear(date.getFullYear() - 10);
                return date;
              })()}
              max={maxDate}
              placeholder="Select date range"
            />
          </div>
        )}

        {/* Standing Capacity Filter */}
        <div className="space-y-2">
          <Label>Standing Capacity</Label>
          <div className="px-2">
            <Slider
              value={standingRange}
              onValueChange={handleStandingRangeChange}
              min={minStanding}
              max={maxStanding}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{standingRange[0].toLocaleString()}</span>
              <span>{standingRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Seated Capacity Filter */}
        <div className="space-y-2">
          <Label>Seated Capacity</Label>
          <div className="px-2">
            <Slider
              value={seatedRange}
              onValueChange={handleSeatedRangeChange}
              min={minSeated}
              max={maxSeated}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{seatedRange[0].toLocaleString()}</span>
              <span>{seatedRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
