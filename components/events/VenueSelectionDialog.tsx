/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon, CheckIcon } from "lucide-react";
import Image from "next/image";
import { useVenues } from "@/lib/hooks/use-venues";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface VenueSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenueId: string | null;
  onSelectVenue: (venue: VenueWithCreator | null) => void;
}

export function VenueSelectionDialog({
  open,
  onOpenChange,
  selectedVenueId,
  onSelectVenue,
}: VenueSelectionDialogProps) {
  const [searchValue, setSearchValue] = useState("");

  // Fetch active venues with search filter
  // Note: Venues are already filtered by pyramid visibility in the backend
  // Event planners only see their own venues and their subordinates' venues
  const { data: venuesData, isLoading } = useVenues({
    status: "active",
    search: searchValue,
    pageSize: 100,
  });

  const venues = venuesData?.data || [];

  const handleSelectVenue = (venue: VenueWithCreator) => {
    onSelectVenue(venue);
    onOpenChange(false);
  };

  const handleClearSelection = () => {
    onSelectVenue(null);
    onOpenChange(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSearchClear = () => {
    setSearchValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[95vw] md:max-w-2xl lg:max-w-4xl xl:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Venue</DialogTitle>
          <DialogDescription>Choose a venue for your event or select "No Venue" if not applicable</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4">
          {/* Search Input */}
          <div className="w-full relative">
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

          {/* No Venue Option */}
          <Button
            variant={selectedVenueId === null ? "default" : "outline"}
            className="w-fit shrink-0"
            onClick={handleClearSelection}
          >
            {selectedVenueId === null && <CheckIcon className="mr-2 h-4 w-4" />}
            No Venue
          </Button>
        </div>

        {/* Venues Grid */}
        <div className="flex-1 min-h-0 pb-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading venues...</p>
            </div>
          ) : venues.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {searchValue ? "No venues found matching your search" : "No active venues available"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4 pb-4">
              {venues.map((venue) => {
                const firstImage = venue.images && venue.images.length > 0 ? venue.images[0] : null;

                // Format location: country/state/city
                const locationParts = [venue.country, venue.state, venue.city].filter(Boolean);
                const location = locationParts.join(" / ");

                // Format dates
                const formatDate = (dateString: string | null) => {
                  if (!dateString) return null;
                  try {
                    return new Date(dateString).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  } catch {
                    return null;
                  }
                };

                const startDate = formatDate(venue.availability_start_date);
                const endDate = formatDate(venue.availability_end_date);

                // Format capacity
                const capacityParts: string[] = [];
                if (venue.capacity_standing) {
                  capacityParts.push(`Standing: ${venue.capacity_standing.toLocaleString()}`);
                }
                if (venue.capacity_seated) {
                  capacityParts.push(`Seated: ${venue.capacity_seated.toLocaleString()}`);
                }
                const capacity = capacityParts.length > 0 ? capacityParts.join(" / ") : "Not specified";

                const isSelected = selectedVenueId === venue.id;

                return (
                  <Card
                    key={venue.id}
                    className={`cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0 ${
                      isSelected ? "border-primary border-2 bg-primary/5 shadow-md" : ""
                    }`}
                    onClick={() => handleSelectVenue(venue)}
                  >
                    {/* Image Section */}
                    <div className="relative flex h-60 items-center justify-center bg-muted overflow-hidden">
                      {firstImage ? (
                        <Image src={firstImage} alt={venue.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                          <span className="text-sm">No image available</span>
                        </div>
                      )}
                      {/* Selection indicator in top-right of image */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="default" className="rounded-sm text-xs bg-primary text-primary-foreground">
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="line-clamp-2">{venue.name}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="flex flex-col gap-2">
                        {location && (
                          <Badge variant="outline" className="rounded-sm w-fit">
                            {location}
                          </Badge>
                        )}
                        {venue.street && (
                          <span className="text-xs line-clamp-2 text-muted-foreground">{venue.street}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3">
                      {(startDate || endDate) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Availability</span>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {startDate && (
                              <Badge variant="outline" className="rounded-sm text-xs">
                                From: {startDate}
                              </Badge>
                            )}
                            {endDate && (
                              <Badge variant="outline" className="rounded-sm text-xs">
                                To: {endDate}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Capacity</span>
                        <p className="text-sm">{capacity}</p>
                      </div>
                      {venue.technical_specs && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Technical Specs</span>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {venue.technical_specs.sound && (
                              <Badge variant="secondary" className="rounded-sm text-xs">
                                Sound
                              </Badge>
                            )}
                            {venue.technical_specs.lights && (
                              <Badge variant="secondary" className="rounded-sm text-xs">
                                Lights
                              </Badge>
                            )}
                            {venue.technical_specs.screens && (
                              <Badge variant="secondary" className="rounded-sm text-xs">
                                Screens
                              </Badge>
                            )}
                            {venue.technical_specs &&
                              !venue.technical_specs.sound &&
                              !venue.technical_specs.lights &&
                              !venue.technical_specs.screens && (
                                <span className="text-xs text-muted-foreground">No specs available</span>
                              )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
