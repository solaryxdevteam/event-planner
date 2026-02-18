"use client";

import { useUnbanVenue } from "@/lib/hooks/use-venues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface UnbanVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueWithCreator;
  onSuccess?: () => void;
}

export function UnbanVenueDialog({ open, onOpenChange, venue, onSuccess }: UnbanVenueDialogProps) {
  const unbanVenue = useUnbanVenue();

  const handleUnban = async () => {
    try {
      await unbanVenue.mutateAsync(venue.id);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>Unban Venue</DialogTitle>
              <DialogDescription>Reactivate this banned venue</DialogDescription>
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

          {/* Info Message */}
          <div className="rounded-lg border border-green-500 bg-green-50 p-4">
            <p className="text-sm text-green-900">
              This action will reactivate the venue and make it available for use in events again.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={unbanVenue.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="default"
            onClick={handleUnban}
            disabled={unbanVenue.isPending}
          >
            {unbanVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unban Venue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
