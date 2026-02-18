"use client";

import { useState, useMemo } from "react";
import { X, Search, Music2, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CATEGORY_OPTIONS } from "@/lib/calendar/constants";
import type { CalendarEvent } from "@/lib/calendar/types";

export interface CalendarFilters {
  djIds: string[];
  countries: string[];
  city: string;
  statuses: string[];
}

export interface DjOption {
  id: string;
  name: string;
}

interface CalendarFiltersBarProps {
  events: CalendarEvent[];
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  /** All DJs for the filter dropdown (from API). If not provided, derived from events. */
  allDjs?: DjOption[];
  /** All countries for the filter dropdown (from venues/API). If not provided, derived from events. */
  allCountries?: string[];
}

export function CalendarFiltersBar({
  events,
  filters,
  onFiltersChange,
  allDjs,
  allCountries,
}: CalendarFiltersBarProps) {
  const [djSearchOpen, setDjSearchOpen] = useState(false);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const uniqueDjsFromEvents = useMemo(() => {
    const djMap = new Map<string, { id: string; name: string }>();
    events.forEach((e) => {
      if (e.djId && e.djName) {
        djMap.set(e.djId, { id: e.djId, name: e.djName });
      }
    });
    return Array.from(djMap.values());
  }, [events]);

  const uniqueCountriesFromEvents = useMemo(() => {
    const countries = new Set<string>();
    events.forEach((e) => {
      if (e.venueCountry) countries.add(e.venueCountry);
    });
    return Array.from(countries).sort();
  }, [events]);

  const uniqueDjs = (allDjs && allDjs.length > 0 ? allDjs : uniqueDjsFromEvents).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const uniqueCountries = allCountries && allCountries.length > 0 ? allCountries : uniqueCountriesFromEvents;

  const activeFilterCount =
    filters.djIds.length + filters.countries.length + filters.statuses.length + (filters.city ? 1 : 0);

  const toggleArrayFilter = (key: "djIds" | "countries" | "statuses", value: string) => {
    const current = filters[key];
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
  };

  const clearAllFilters = () => {
    onFiltersChange({ djIds: [], countries: [], city: "", statuses: [] });
  };

  return (
    <div className="flex flex-col space-y-2 border-b px-4 pt-2 pb-2">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        {/* DJs filter */}
        <Popover open={djSearchOpen} onOpenChange={setDjSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filters.djIds.length > 0 ? "default" : "outline"}
              className="h-9 gap-2 px-4 text-sm font-medium transition-all"
            >
              <Music2 className="h-4 w-4" />
              DJs
              {filters.djIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.djIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search DJs..." />
              <CommandList>
                <CommandEmpty>No DJs found.</CommandEmpty>
                <CommandGroup>
                  {uniqueDjs.map((dj) => (
                    <CommandItem key={dj.id} value={dj.name} onSelect={() => toggleArrayFilter("djIds", dj.id)}>
                      <Checkbox checked={filters.djIds.includes(dj.id)} className="mr-2" />
                      <span className="truncate">{dj.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Country filter */}
        <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filters.countries.length > 0 ? "default" : "outline"}
              className="h-9 gap-2 px-4 text-sm font-medium transition-all"
            >
              <Globe className="h-4 w-4" />
              Country
              {filters.countries.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.countries.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>No countries found.</CommandEmpty>
                <CommandGroup>
                  {uniqueCountries.map((country) => (
                    <CommandItem key={country} value={country} onSelect={() => toggleArrayFilter("countries", country)}>
                      <Checkbox checked={filters.countries.includes(country)} className="mr-2" />
                      <span className="truncate">{country}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* City text field */}
        <div className="relative">
          <MapPin className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Filter by city..."
            value={filters.city}
            onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
            className="h-9 w-40 pl-8 text-sm"
          />
          {filters.city && (
            <button
              onClick={() => onFiltersChange({ ...filters, city: "" })}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filters.statuses.length > 0 ? "default" : "outline"}
              className="h-9 gap-2 px-4 text-sm font-medium transition-all"
            >
              <Search className="h-4 w-4" />
              Status
              {filters.statuses.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.statuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-3">
              <h4 className="text-muted-foreground text-sm font-medium">Event Status</h4>
              <div className="max-h-48 space-y-3 overflow-y-auto">
                {CATEGORY_OPTIONS.map((status) => (
                  <div key={status.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={filters.statuses.includes(status.value)}
                      onCheckedChange={() => toggleArrayFilter("statuses", status.value)}
                    />
                    <Label htmlFor={`status-${status.value}`} className="cursor-pointer text-sm font-normal">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}:
          </span>
          {filters.djIds.map((id) => {
            const dj = uniqueDjs.find((d) => d.id === id);
            return (
              <Badge
                key={`dj-${id}`}
                variant="outline"
                className="h-7 gap-1.5 border-purple-200 bg-purple-50 px-2 py-1 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
              >
                <Music2 className="h-3 w-3" />
                <span className="max-w-[120px] truncate text-xs font-medium">{dj?.name || id}</span>
                <button
                  onClick={() => toggleArrayFilter("djIds", id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          {filters.countries.map((country) => (
            <Badge
              key={`country-${country}`}
              variant="outline"
              className="h-7 gap-1.5 border-green-200 bg-green-50 px-2 py-1 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            >
              <Globe className="h-3 w-3" />
              <span className="text-xs font-medium">{country}</span>
              <button
                onClick={() => toggleArrayFilter("countries", country)}
                className="ml-1 rounded-full p-0.5 hover:bg-green-200 dark:hover:bg-green-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {filters.city && (
            <Badge
              variant="outline"
              className="h-7 gap-1.5 border-orange-200 bg-orange-50 px-2 py-1 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
            >
              <MapPin className="h-3 w-3" />
              <span className="text-xs font-medium">{filters.city}</span>
              <button
                onClick={() => onFiltersChange({ ...filters, city: "" })}
                className="ml-1 rounded-full p-0.5 hover:bg-orange-200 dark:hover:bg-orange-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.statuses.map((status) => {
            const statusOption = CATEGORY_OPTIONS.find((s) => s.value === status);
            return (
              <Badge
                key={`status-${status}`}
                variant="outline"
                className="h-7 gap-1.5 border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                <span className="text-xs font-medium">{statusOption?.label || status}</span>
                <button
                  onClick={() => toggleArrayFilter("statuses", status)}
                  className="ml-1 rounded-full p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-muted border-muted-foreground/30 hover:border-muted-foreground/50 h-7 gap-1.5 border border-dashed px-3 text-xs font-medium transition-all"
          >
            <X className="h-3.5 w-3.5" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
