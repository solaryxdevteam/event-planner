"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon, BanIcon, TrashIcon, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardDescription, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { DeleteVenueDialog } from "./DeleteVenueDialog";
import { BanVenueDialog } from "./BanVenueDialog";
import { UnbanVenueDialog } from "./UnbanVenueDialog";
import { UserRole } from "@/lib/types/roles";

interface VenueCardProps {
  venue: VenueWithCreator;
  onDelete: (venueId: string) => void;
  onBan?: (venueId: string) => void;
  userRole: string;
}

export function VenueCard({ venue, onDelete, onBan, userRole }: VenueCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  // short_id is a new column on venues; it's not yet in the generated types
  const shortId = (venue as any).short_id as string | undefined;

  const firstImage = venue.images && venue.images.length > 0 ? venue.images[0] : null;
  const isGlobalDirector = userRole === UserRole.GLOBAL_DIRECTOR;
  const isEventPlanner = userRole === UserRole.EVENT_PLANNER;
  const canDelete = isGlobalDirector || isEventPlanner;
  const canEdit = isGlobalDirector || isEventPlanner;

  const isActive = venue.is_active;

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

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0">
      {/* Image Section */}
      <div className="relative flex h-60 items-center justify-center bg-muted overflow-hidden">
        {firstImage ? (
          <img src={firstImage} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <span className="text-sm">No image available</span>
          </div>
        )}
        {/* Status badge in top-right of image */}
        <div className="absolute top-2 right-2">
          {isActive ? (
            <Badge variant="white" className="rounded-sm text-xs">
              Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="rounded-sm text-xs text-white">
              Banned
            </Badge>
          )}
        </div>
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
          {venue.street && <span className="text-xs">{venue.street}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
      <CardFooter className="flex flex-col gap-3 mt-auto pb-4">
        {/* Short ID at bottom of card */}
        {shortId && (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">Venue ID</span>
            <Badge variant="outline" className="text-xs font-mono">
              {shortId}
            </Badge>
          </div>
        )}

        <div className="flex justify-end gap-2 flex-wrap w-full">
          {isGlobalDirector && onBan && !isActive && (
            <Button size="sm" className="flex-1" variant="default" onClick={() => setUnbanDialogOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Unban
            </Button>
          )}
          {isGlobalDirector && onBan && isActive && (
            <Button size="sm" className="flex-1" variant="destructive" onClick={() => setBanDialogOpen(true)}>
              <BanIcon className="mr-2 h-4 w-4" />
              Ban
            </Button>
          )}
          {canDelete && (
            <Button size="sm" className="flex-1" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}

          {canEdit && (
            <Button asChild className="flex-1" size="sm" variant="default">
              <Link href={`/dashboard/venues/${shortId || venue.id}/edit`}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Delete Dialog */}
      <DeleteVenueDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        venue={venue}
        onSuccess={() => {
          // Refresh the list after deletion
          onDelete(venue.id);
        }}
      />

      {/* Ban Dialog */}
      {isGlobalDirector && onBan && isActive && (
        <BanVenueDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          venue={venue}
          onSuccess={() => {
            // Refresh the list after banning
            onBan(venue.id);
          }}
        />
      )}

      {/* Unban Dialog */}
      {isGlobalDirector && onBan && !isActive && (
        <UnbanVenueDialog
          open={unbanDialogOpen}
          onOpenChange={setUnbanDialogOpen}
          venue={venue}
          onSuccess={() => {
            // Refresh the list after unbanning
            onBan(venue.id);
          }}
        />
      )}
    </Card>
  );
}
