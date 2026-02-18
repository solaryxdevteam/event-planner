/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon, CheckIcon, PlusIcon } from "lucide-react";
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
  const router = useRouter();
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

  const handleAddNewVenue = () => {
    onOpenChange(false);
    router.push("/dashboard/venues/new");
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
              {/* Add new venue card - first */}
              <Card
                className="cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 py-0"
                onClick={handleAddNewVenue}
              >
                <div className="relative flex h-full items-center justify-center bg-muted overflow-hidden">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <PlusIcon className="h-14 w-14" />
                    <span className="text-sm font-medium">Add new venue</span>
                    <span className="text-xs text-center px-4">Create a new venue to use for events</span>
                    <span className="text-xs text-center px-4">Click to go to the venue creation page</span>
                  </div>
                </div>
              </Card>

              {venues.map((venue) => {
                // Cover image: first media item with isCover, or first photo
                const media = venue.media && Array.isArray(venue.media) ? venue.media : [];
                const coverItem =
                  media.find((m: { isCover?: boolean; type?: string }) => m.isCover && m.type === "photo") ||
                  media.find((m: { type?: string }) => m.type === "photo");
                const coverImageUrl = coverItem && typeof coverItem.url === "string" ? coverItem.url : null;

                // Format location: country / city (state removed from schema)
                const locationParts = [venue.country, venue.city].filter(Boolean);
                const location = locationParts.join(" / ");

                // Format capacity (total_capacity, number_of_tables, ticket_capacity)
                const capacityParts: string[] = [];
                if (venue.total_capacity != null) {
                  capacityParts.push(`Total: ${venue.total_capacity.toLocaleString()}`);
                }
                if (venue.number_of_tables != null) {
                  capacityParts.push(`Tables: ${venue.number_of_tables.toLocaleString()}`);
                }
                if (venue.ticket_capacity != null) {
                  capacityParts.push(`Tickets: ${venue.ticket_capacity.toLocaleString()}`);
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
                      {coverImageUrl ? (
                        <Image src={coverImageUrl} alt={venue.name} fill className="object-cover" unoptimized />
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
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Capacity</span>
                        <p className="text-sm">{capacity}</p>
                      </div>
                      {(venue.sounds?.trim() || venue.lights?.trim() || venue.screens?.trim()) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Technical Specs</span>
                          <p className="text-sm line-clamp-2">
                            {[
                              venue.sounds?.trim() && `Sounds: ${venue.sounds.trim()}`,
                              venue.lights?.trim() && `Lights: ${venue.lights.trim()}`,
                              venue.screens?.trim() && `Screens: ${venue.screens.trim()}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
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
