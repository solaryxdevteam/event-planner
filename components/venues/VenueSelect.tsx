"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVenues } from "@/lib/actions/venues";
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
  const [venues, setVenues] = useState<VenueWithCreator[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      setIsLoading(true);
      setError(null);

      const result = await getVenues({ search: searchQuery });

      if (cancelled) return;

      if (result.success) {
        setVenues(result.data);
      } else {
        setError(result.error);
        setVenues([]);
      }

      setIsLoading(false);
    }

    loadVenues();

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const filteredVenues = searchQuery
    ? venues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : venues;

  const selectedVenue = venues.find((v) => v.id === value);

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
            {error ? (
              <div className="p-2 text-sm text-destructive">{error}</div>
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
                      {venue.capacity && ` • Capacity: ${venue.capacity.toLocaleString()}`}
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
            {selectedVenue.capacity && (
              <span>
                <strong>Capacity:</strong> {selectedVenue.capacity.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
