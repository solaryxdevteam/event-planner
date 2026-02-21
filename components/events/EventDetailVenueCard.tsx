"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { VenueMapDisplay } from "./VenueMapDisplay";
import { VenueMediaAndFloorPlans } from "./VenueMediaAndFloorPlans";

type Venue = NonNullable<EventWithRelations["venue"]>;

interface EventDetailVenueCardProps {
  venue: Venue;
}

export function EventDetailVenueCard({ venue }: EventDetailVenueCardProps) {
  const venueAddress = [venue.address, venue.city, venue.country].filter(Boolean).join(", ");
  const mapUrl =
    venue.location_lat != null && venue.location_lng != null
      ? `https://www.google.com/maps?q=${venue.location_lat},${venue.location_lng}`
      : venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
        : null;

  const venueMedia = venue.media && Array.isArray(venue.media) ? venue.media : [];
  const venueCover =
    venueMedia.find((m: { isCover?: boolean; type?: string }) => m.isCover && m.type === "photo") ||
    venueMedia.find((m: { type?: string }) => m.type === "photo");
  const venueImage = venueCover && typeof venueCover.url === "string" ? venueCover.url : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Venue / Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {venueImage && (
          <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
            <Image src={venueImage} alt={venue.name || "Venue image"} fill className="object-cover" unoptimized />
          </div>
        )}

        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{venue.name}</p>
          {venue.street && <p className="text-muted-foreground">{venue.street}</p>}
          {(venue.city || venue.country) && (
            <p className="text-muted-foreground">{[venue.city, venue.country].filter(Boolean).join(", ")}</p>
          )}
          {(venue.total_capacity != null || venue.number_of_tables != null || venue.ticket_capacity != null) && (
            <div className="pt-2 border-t space-y-1">
              {venue.total_capacity != null && (
                <p className="text-muted-foreground">Capacity: {venue.total_capacity.toLocaleString()}</p>
              )}
              {venue.number_of_tables != null && (
                <p className="text-muted-foreground">Tables: {venue.number_of_tables.toLocaleString()}</p>
              )}
              {venue.ticket_capacity != null && (
                <p className="text-muted-foreground">Ticket capacity: {venue.ticket_capacity.toLocaleString()}</p>
              )}
            </div>
          )}
          {(venue.sounds?.trim() || venue.lights?.trim() || venue.screens?.trim()) && (
            <div className="pt-2 border-t space-y-1">
              {venue.sounds?.trim() && <p className="text-muted-foreground">Sounds: {venue.sounds.trim()}</p>}
              {venue.lights?.trim() && <p className="text-muted-foreground">Lights: {venue.lights.trim()}</p>}
              {venue.screens?.trim() && <p className="text-muted-foreground">Screens: {venue.screens.trim()}</p>}
            </div>
          )}
          {(venue.contact_person_name || venue.contact_email) && (
            <div className="pt-2 border-t space-y-1">
              {venue.contact_person_name && (
                <p className="text-muted-foreground">Contact: {venue.contact_person_name}</p>
              )}
              {venue.contact_email && (
                <p className="text-muted-foreground">
                  <a href={`mailto:${venue.contact_email}`} className="text-primary hover:underline">
                    {venue.contact_email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        <VenueMediaAndFloorPlans media={venue.media} floorPlans={venue.floor_plans} />

        {venue.location_lat != null && venue.location_lng != null ? (
          <VenueMapDisplay lat={venue.location_lat} lng={venue.location_lng} venueName={venue.name || undefined} />
        ) : mapUrl ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
            </a>
          </Button>
        ) : null}

        <Button asChild variant="outline" size="sm" className="w-full" disabled={!venue.short_id}>
          {venue.short_id ? <Link href={`/dashboard/venues/${venue.short_id}/edit`}>View Venue Details</Link> : null}
        </Button>
      </CardContent>
    </Card>
  );
}
