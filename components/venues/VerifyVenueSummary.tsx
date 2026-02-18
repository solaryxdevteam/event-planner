"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VerifyVenueInfo } from "@/lib/services/venues/venue-contact-verification.service";
import Image from "next/image";

interface VerifyVenueSummaryProps {
  venue: VerifyVenueInfo;
}

/**
 * Read-only venue summary for the verify-venue page (same info style as VenueCard, no actions).
 */
export function VerifyVenueSummary({ venue }: VerifyVenueSummaryProps) {
  const locationParts = [venue.country, venue.city].filter(Boolean);
  const location = locationParts.join(" / ");

  const capacityParts: string[] = [];
  if (venue.total_capacity != null) capacityParts.push(`Capacity: ${venue.total_capacity.toLocaleString()}`);
  if (venue.ticket_capacity != null) capacityParts.push(`Tickets: ${venue.ticket_capacity.toLocaleString()}`);
  const capacity = capacityParts.length > 0 ? capacityParts.join(" / ") : "Not specified";
  const coverImage = venue.cover_image;

  return (
    <Card className="overflow-hidden shadow-sm pt-0">
      <div className="relative flex h-32 shrink-0 items-center justify-center bg-muted overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
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
      </div>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle className="line-clamp-2">{venue.name}</CardTitle>
          <CardDescription className="flex flex-col gap-2">
            {location && (
              <Badge variant="outline" className="rounded-sm w-fit">
                {location}
              </Badge>
            )}
            {venue.street && <span className="text-xs">{venue.street}</span>}
            {venue.contact_person_name && (
              <span className="text-xs text-muted-foreground">Contact: {venue.contact_person_name}</span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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

        {venue.short_id && (
          <div className="flex items-center justify-between w-full pt-2 border-t">
            <span className="text-xs text-muted-foreground">Venue ID</span>
            <Badge variant="outline" className="text-xs font-mono">
              {venue.short_id}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
