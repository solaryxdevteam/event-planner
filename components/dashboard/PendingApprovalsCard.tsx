"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, Calendar, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

/** Approval type label for badge (event request, event modification, etc.) */
const APPROVAL_TYPE_LABELS: Record<string, string> = {
  event: "Event request",
  modification: "Event modification",
  cancellation: "Event cancellation",
  report: "Event report",
  venue: "Venue request",
};

export type PendingEventApprovalItem = {
  type: "event";
  id: string;
  event_id: string;
  approval_type: string;
  event?: { title?: string; starts_at?: string; short_id?: string; created_at?: string };
  created_at?: string;
};

export type PendingVenueApprovalItem = {
  type: "venue";
  id: string;
  venue_id: string;
  venue?: { name?: string; short_id?: string; city?: string; country?: string; created_at?: string };
  created_at?: string;
};

export type PendingApprovalItem = PendingEventApprovalItem | PendingVenueApprovalItem;

/** Single row for an event approval in the dashboard pending list */
function PendingEventApprovalRow({ approval, typeLabel }: { approval: PendingEventApprovalItem; typeLabel: string }) {
  const event = approval.event;
  const linkId = event?.short_id ?? approval.event_id;
  const dateStr = event?.starts_at ? format(new Date(event.starts_at), "EEE, MMM d, yyyy") : "";

  return (
    <Link
      href={linkId ? `/dashboard/events/${linkId}` : "/dashboard/approvals"}
      className="flex items-center justify-between gap-3 py-3 border-b last:border-0 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{event?.title ?? "Event"}</p>
        {dateStr && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {typeLabel}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

/** Single row for a venue approval in the dashboard pending list */
function PendingVenueApprovalRow({ approval }: { approval: PendingVenueApprovalItem }) {
  const venue = approval.venue;
  const shortId = venue?.short_id;
  const href = shortId ? `/dashboard/venues/${shortId}/edit` : "/dashboard/approvals?type=venues";
  const locationStr = venue?.city || venue?.country ? [venue.city, venue.country].filter(Boolean).join(", ") : "";

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-3 border-b last:border-0 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{venue?.name ?? "Venue"}</p>
        {locationStr && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {locationStr}
          </p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {APPROVAL_TYPE_LABELS.venue}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

type PendingApprovalsCardProps = {
  approvals: PendingApprovalItem[];
  isLoading: boolean;
};

export function PendingApprovalsCard({ approvals, isLoading }: PendingApprovalsCardProps) {
  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-4 shadow-none gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 gap-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
          Pending Approvals
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/dashboard/approvals">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded" />
            ))}
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30">
            <ListChecks className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No pending approvals</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/approvals">Go to approvals</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {approvals.map((item) =>
              item.type === "event" ? (
                <PendingEventApprovalRow
                  key={item.id}
                  approval={item}
                  typeLabel={APPROVAL_TYPE_LABELS[item.approval_type] ?? "Event request"}
                />
              ) : (
                <PendingVenueApprovalRow key={item.id} approval={item} />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
