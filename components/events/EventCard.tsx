"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Music2, Users, Eye, Trash2, Send, DollarSign, Copy } from "lucide-react";
import { format } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

interface EventCardProps {
  event: EventWithRelations;
  onView?: (eventShortId: string) => void;
  onDelete?: (eventId: string) => void;
  onSubmit?: (eventId: string) => void;
  onCreateFromRejected?: (event: EventWithRelations) => void;
  showActions?: boolean;
  hasPendingModification?: boolean;
  hasPendingCancellation?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  in_review: "bg-blue-500",
  rejected: "bg-red-500",
  approved_scheduled: "bg-green-500",
  completed_awaiting_report: "bg-yellow-500",
  completed_archived: "bg-slate-500",
  cancelled: "bg-orange-500",
};

const statusBorderColors: Record<string, string> = {
  draft: "border-l-gray-500",
  in_review: "border-l-blue-500",
  rejected: "border-l-red-500",
  approved_scheduled: "border-l-green-500",
  completed_awaiting_report: "border-l-yellow-500",
  completed_archived: "border-l-slate-500",
  cancelled: "border-l-orange-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  rejected: "Rejected",
  approved_scheduled: "Approved",
  completed_awaiting_report: "Awaiting Report",
  completed_archived: "Archived",
  cancelled: "Cancelled",
};

export function EventCard({
  event,
  onView,
  onDelete,
  onSubmit,
  onCreateFromRejected,
  showActions = true,
  hasPendingModification = false,
  hasPendingCancellation = false,
}: EventCardProps) {
  const startDate = event.starts_at ? new Date(event.starts_at) : null;
  const venueMedia = event.venue?.media && Array.isArray(event.venue.media) ? event.venue.media : [];
  const coverUrl =
    venueMedia.find((m: { isCover?: boolean; type?: string }) => m.isCover && m.type === "photo")?.url ||
    venueMedia.find((m: { type?: string }) => m.type === "photo")?.url ||
    null;

  return (
    <Card
      className={`overflow-hidden hover:shadow-lg pt-0 transition-all duration-200 border-l-4 ${statusBorderColors[event.status] || "border-l-gray-500"}`}
    >
      {/* First venue image */}
      <div className="relative h-40 w-full bg-muted">
        {coverUrl ? (
          <Image src={coverUrl} alt={event.venue?.name ?? event.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No venue image</div>
        )}
      </div>
      <CardHeader className="pb-0">
        <div className="flex flex-col items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
            {event.short_id && (
              <Badge variant="secondary" className="text-xs font-mono">
                {event.short_id}
              </Badge>
            )}
            {/* {event.description && <CardDescription className="line-clamp-2 mt-1">{event.description}</CardDescription>} */}
          </div>
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            <Badge variant="outline" className={`${statusColors[event.status] || "bg-gray-500"} text-white border-0`}>
              {statusLabels[event.status] || event.status}
            </Badge>
            {hasPendingModification && (
              <Badge variant="secondary" className="text-xs">
                Modification Pending
              </Badge>
            )}
            {hasPendingCancellation && (
              <Badge variant="destructive" className="text-xs">
                Cancellation Pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Event Date/Time */}
          {startDate && (
            <div className="flex items-start text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{format(startDate, "MMM d, yyyy")}</div>
                <div className="text-xs mt-0.5">{format(startDate, "h:mm a")}</div>
              </div>
            </div>
          )}

          {/* Venue */}
          {event.venue && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4" />
              <span>{event.venue.name}</span>
            </div>
          )}

          {/* DJ */}
          {event.dj && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Music2 className="mr-2 h-4 w-4" />
              <span>{event.dj.name}</span>
            </div>
          )}

          {/* Expected Attendance */}
          {event.expected_attendance && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-2 h-4 w-4" />
              <span>{event.expected_attendance.toLocaleString()} expected attendees</span>
            </div>
          )}

          {/* Min prices */}
          {(event.minimum_ticket_price != null || event.minimum_table_price != null) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {event.minimum_ticket_price != null && (
                <span className="flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" />
                  Ticket from{" "}
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    Number(event.minimum_ticket_price)
                  )}
                </span>
              )}
              {event.minimum_table_price != null && (
                <span className="flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" />
                  Table from{" "}
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    Number(event.minimum_table_price)
                  )}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {(onView && event.short_id) ||
          (showActions && (onSubmit || onDelete)) ||
          (onCreateFromRejected && event.status === "rejected") ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {/* View is always available when handler + short_id exist, even if showActions=false */}
              {onView && event.short_id && (
                <Button className="flex-1 min-w-0" variant="outline" size="sm" onClick={() => onView(event.short_id!)}>
                  <Eye className="mr-2 h-4 w-4 shrink-0" />
                  View
                </Button>
              )}
              {/* Create New from This: per-card action for rejected events */}
              {onCreateFromRejected && event.status === "rejected" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-0"
                  onClick={() => onCreateFromRejected(event)}
                  aria-label={`Create new event from: ${event.title}`}
                >
                  <Copy className="mr-2 h-4 w-4 shrink-0" />
                  Create New from This
                </Button>
              )}
              {/* Submit/Delete are controlled by showActions and only for drafts */}
              {showActions && onSubmit && event.status === "draft" && (
                <Button variant="default" size="sm" onClick={() => onSubmit(event.id)}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </Button>
              )}
              {showActions && onDelete && event.status === "draft" && (
                <Button variant="destructive" size="sm" onClick={() => onDelete(event.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
