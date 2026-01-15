"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VenueActions } from "./VenueActions";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { Badge } from "@/components/ui/badge";

interface VenueTableProps {
  venues: VenueWithCreator[];
  onEdit: (venue: VenueWithCreator) => void;
  onDelete: (venueId: string) => void;
  onBan?: (venueId: string) => void;
  userRole: string;
}

export function VenueTable({ venues, onEdit, onDelete, onBan, userRole }: VenueTableProps) {
  if (venues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No venues found</p>
        <p className="text-sm mt-2">Create your first venue to get started</p>
      </div>
    );
  }

  const isGlobalDirector = userRole === "global_director";

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Capacity</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((venue) => (
            <TableRow key={venue.id}>
              <TableCell className="font-medium">{venue.name}</TableCell>
              <TableCell className="max-w-xs truncate" title={venue.address}>
                {venue.address}
              </TableCell>
              <TableCell>{venue.city}</TableCell>
              <TableCell className="text-right">{venue.capacity ? venue.capacity.toLocaleString() : "—"}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="text-sm">{venue.creator?.name || "Unknown"}</span>
                  <Badge variant="outline" className="w-fit text-xs">
                    {formatRole(venue.creator?.role || "event_planner")}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <VenueActions
                  venue={venue}
                  onEdit={() => onEdit(venue)}
                  onDelete={() => onDelete(venue.id)}
                  onBan={isGlobalDirector ? () => onBan?.(venue.id) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    event_planner: "Event Planner",
    city_curator: "City Curator",
    regional_curator: "Regional Curator",
    lead_curator: "Lead Curator",
    global_director: "Global Director",
  };
  return roleMap[role] || role;
}
