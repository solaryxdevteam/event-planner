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
import { useDeactivateDj } from "@/lib/hooks/use-djs";

interface DeactivateDjDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dj: DJ;
  onSuccess?: () => void;
}

export function DeactivateDjDialog({ open, onOpenChange, dj, onSuccess }: DeactivateDjDialogProps) {
  const deactivateMutation = useDeactivateDj();

  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(dj.short_id);
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
          <DialogTitle>Deactivate DJ</DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate <strong>{dj.name}</strong>? They will no longer appear as an option when
            assigning DJs to new events. You can reactivate them later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deactivateMutation.isPending}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleDeactivate} disabled={deactivateMutation.isPending}>
            {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
