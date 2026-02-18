"use client";

import { useState, useEffect } from "react";
import { useBanVenue } from "@/lib/hooks/use-venues";
import { checkVenueUpcomingEvents } from "@/lib/services/client/venues.client.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, BanIcon, AlertTriangle } from "lucide-react";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface BanVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueWithCreator;
  onSuccess?: (reason?: string) => void;
}

export function BanVenueDialog({ open, onOpenChange, venue, onSuccess }: BanVenueDialogProps) {
  const [reason, setReason] = useState("");
  const [hasUpcomingEvents, setHasUpcomingEvents] = useState<boolean | null>(null);
  const [checkingUpcoming, setCheckingUpcoming] = useState(false);
  const banVenue = useBanVenue();

  // Check for upcoming events when dialog opens
  useEffect(() => {
    if (open) {
      // Set state asynchronously to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setCheckingUpcoming(true);
      });
      checkVenueUpcomingEvents(venue.id)
        .then((hasUpcoming) => {
          setHasUpcomingEvents(hasUpcoming);
        })
        .catch((error) => {
          console.error("Failed to check upcoming events:", error);
          // If check fails, assume no upcoming events to allow ban attempt
          // The backend will catch it anyway
          setHasUpcomingEvents(false);
        })
        .finally(() => {
          setCheckingUpcoming(false);
        });
    } else {
      // Reset state when dialog closes (asynchronously to avoid synchronous setState in effect)
      Promise.resolve().then(() => {
        setReason("");
        setHasUpcomingEvents(null);
      });
    }
  }, [open, venue.id]);

  const handleBan = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for banning this venue");
      return;
    }

    try {
      await banVenue.mutateAsync({ id: venue.id, reason: reason.trim() });
      const banReason = reason.trim();
      setReason("");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess(banReason);
      }
    } catch {
      // Error is handled by the mutation hook (toast shown)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <BanIcon className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Ban Venue</DialogTitle>
              <DialogDescription>Ban this venue from the system</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Venue Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="text-sm">
              <p className="text-muted-foreground">Venue Name</p>
              <p className="font-medium">{venue.name}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{[venue.city, venue.country].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-2">
            <Label htmlFor="ban-reason">
              Reason for Ban <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for banning this venue..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={banVenue.isPending}
            />
            <p className="text-xs text-muted-foreground">This reason will be logged in the audit trail.</p>
          </div>

          {/* Upcoming Events Warning */}
          {checkingUpcoming ? (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Checking for upcoming events...</p>
              </div>
            </div>
          ) : hasUpcomingEvents ? (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">Cannot Ban Venue</p>
                  <p className="text-sm text-destructive/90">
                    This venue has upcoming events. Please cancel or reschedule all upcoming events before banning the
                    venue.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                This action will ban the venue and prevent it from being used in events. This action can be reversed
                later by unbanning the venue.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReason("");
              onOpenChange(false);
            }}
            disabled={banVenue.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="destructive"
            onClick={handleBan}
            disabled={banVenue.isPending || !reason.trim() || hasUpcomingEvents === true || checkingUpcoming}
          >
            {banVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ban Venue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
