"use client";

import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVenuesWithSearch } from "@/lib/hooks/use-venues";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface VenueSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * VenueSelect component
 *
 * A searchable dropdown for selecting venues
 * Used in event forms and other places where venue selection is needed
 */
export function VenueSelect({
  value,
  onValueChange,
  label = "Venue",
  placeholder = "Select a venue",
  required = false,
  disabled = false,
}: VenueSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Use React Query to fetch venues with search
  const { data: venues = [], isLoading, error } = useVenuesWithSearch(searchQuery || undefined);

  // Filter venues client-side for better UX (search is already done server-side, but we can refine)
  const filteredVenues = useMemo(() => {
    if (!searchQuery) return venues;

    const query = searchQuery.toLowerCase();
    return venues.filter(
      (venue) =>
        venue.name.toLowerCase().includes(query) ||
        venue.city.toLowerCase().includes(query) ||
        venue.address.toLowerCase().includes(query)
    );
  }, [venues, searchQuery]);

  const selectedVenue = venues.find((v) => v.id === value);

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="space-y-2">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Select Dropdown */}
        <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoading ? "Loading venues..." : placeholder}>
              {selectedVenue ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedVenue.name}</span>
                  <span className="text-muted-foreground text-xs">• {selectedVenue.city}</span>
                </div>
              ) : (
                placeholder
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {errorMessage ? (
              <div className="p-2 text-sm text-destructive">{errorMessage}</div>
            ) : filteredVenues.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                {searchQuery ? "No venues found" : "No venues available"}
              </div>
            ) : (
              filteredVenues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{venue.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {venue.address}, {venue.city}
                      {(venue.capacity_standing || venue.capacity_seated) &&
                        ` • Capacity: ${Math.max(venue.capacity_standing || 0, venue.capacity_seated || 0).toLocaleString()}`}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedVenue && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
          <div className="flex items-center justify-between">
            <span>
              <strong>Address:</strong> {selectedVenue.address}
            </span>
            {(selectedVenue.capacity_standing || selectedVenue.capacity_seated) && (
              <span>
                <strong>Capacity:</strong>{" "}
                {Math.max(selectedVenue.capacity_standing || 0, selectedVenue.capacity_seated || 0).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
