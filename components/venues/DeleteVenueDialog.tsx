"use client";

import { useDeleteVenue } from "@/lib/hooks/use-venues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, TrashIcon } from "lucide-react";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

interface DeleteVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueWithCreator;
  onSuccess?: () => void;
}

export function DeleteVenueDialog({ open, onOpenChange, venue, onSuccess }: DeleteVenueDialogProps) {
  const deleteVenue = useDeleteVenue();

  const handleDelete = async () => {
    try {
      await deleteVenue.mutateAsync(venue.id);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Error is handled by the mutation hook (toast shown)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <TrashIcon className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Venue</DialogTitle>
              <DialogDescription>Are you sure you want to delete this venue?</DialogDescription>
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
              <p className="font-medium">{[venue.city, venue.state, venue.country].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              This action will soft delete the venue (deactivate it). The venue will be hidden from the system but can
              be reactivated later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleteVenue.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteVenue.isPending}
          >
            {deleteVenue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Venue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
