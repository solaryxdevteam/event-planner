"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DJ } from "@/lib/types/database.types";
import { useDeleteDj } from "@/lib/hooks/use-djs";

interface DeleteDjDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dj: DJ;
  onSuccess?: () => void;
}

export function DeleteDjDialog({ open, onOpenChange, dj, onSuccess }: DeleteDjDialogProps) {
  const deleteMutation = useDeleteDj();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(dj.short_id);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Toast handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete DJ</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{dj.name}</strong> from the DJ list? This will soft-delete the
            profile. You can no longer assign them to new events.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
