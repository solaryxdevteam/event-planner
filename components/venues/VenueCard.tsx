"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PencilIcon, BanIcon, TrashIcon, CheckCircle2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardDescription, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { getVenueDisplayStatus, VENUE_DISPLAY_STATUS_LABELS } from "@/lib/utils/venue-status";
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
  const shortId = venue.short_id;

  const coverMedia = venue.media?.find((m) => m.isCover) ?? venue.media?.[0];
  const firstImage = coverMedia?.url ?? (venue.media && venue.media[0] ? venue.media[0].url : null);
  const isGlobalDirector = userRole === UserRole.GLOBAL_DIRECTOR;
  const isEventPlanner = userRole === UserRole.EVENT_PLANNER;
  const canDelete = isGlobalDirector || isEventPlanner;

  const displayStatus = getVenueDisplayStatus(venue);

  const locationParts = [venue.country, venue.city].filter(Boolean);
  const location = locationParts.join(" / ");

  const capacityParts: string[] = [];
  if (venue.total_capacity != null) capacityParts.push(`Capacity: ${venue.total_capacity.toLocaleString()}`);
  if (venue.ticket_capacity != null) capacityParts.push(`Tickets: ${venue.ticket_capacity.toLocaleString()}`);
  const capacity = capacityParts.length > 0 ? capacityParts.join(" / ") : "Not specified";

  const contactVerified = venue.contact_email_verified === true;

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0">
      {/* Cover image as thumbnail */}
      <div className="relative flex h-32 shrink-0 items-center justify-center bg-muted overflow-hidden">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={venue.name}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 400px) 100vw, 340px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <span className="text-sm">No image</span>
          </div>
        )}
        {/* Status badge in top-right of image */}
        <div className="absolute top-2 right-2">
          <Badge
            variant={
              displayStatus === "active"
                ? "white"
                : displayStatus === "banned" || displayStatus === "rejected"
                  ? "destructive"
                  : "secondary"
            }
            className={
              displayStatus === "active"
                ? "rounded-sm text-xs text-gray-900 dark:text-gray-900"
                : displayStatus === "banned" || displayStatus === "rejected"
                  ? "rounded-sm text-xs text-white"
                  : "rounded-sm text-xs"
            }
          >
            {VENUE_DISPLAY_STATUS_LABELS[displayStatus]}
          </Badge>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2">{venue.name}</CardTitle>
          </div>
        </div>
        <CardDescription className="flex flex-col gap-2">
          {/* Verified by venue contact person */}
          <div className="flex items-center gap-2">
            {contactVerified ? (
              <Badge variant="secondary" className="rounded-sm text-xs gap-1 w-fit">
                <CheckCircle className="h-3.5 w-3.5" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-sm text-xs gap-1 w-fit text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />
                Not verified
              </Badge>
            )}
          </div>
          {location && (
            <Badge variant="outline" className="rounded-sm w-fit">
              {location}
            </Badge>
          )}
          {venue.street && <span className="text-xs">{venue.street}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Number of tables */}
        {venue.number_of_tables != null && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Tables</span>
            <p className="text-sm">{venue.number_of_tables.toLocaleString()}</p>
          </div>
        )}

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
          {isGlobalDirector && onBan && displayStatus === "banned" && (
            <Button size="sm" className="flex-1" variant="default" onClick={() => setUnbanDialogOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Unban
            </Button>
          )}
          {isGlobalDirector && onBan && displayStatus === "active" && (
            <Button size="sm" className="flex-1" variant="outline" onClick={() => setBanDialogOpen(true)}>
              <BanIcon className="mr-2 h-4 w-4" />
              Ban
            </Button>
          )}
          {canDelete && (
            <Button size="sm" className="flex-1" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}

          <Button asChild className="flex-1" size="sm" variant="default">
            <Link href={`/dashboard/venues/${shortId || venue.id}/edit`}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
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
      {isGlobalDirector && onBan && displayStatus === "active" && (
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
      {isGlobalDirector && onBan && displayStatus === "banned" && (
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
