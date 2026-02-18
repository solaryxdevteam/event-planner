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
import { useActivateDj } from "@/lib/hooks/use-djs";

interface ActivateDjDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dj: DJ;
  onSuccess?: () => void;
}

export function ActivateDjDialog({ open, onOpenChange, dj, onSuccess }: ActivateDjDialogProps) {
  const activateMutation = useActivateDj();

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(dj.short_id);
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
          <DialogTitle>Activate DJ</DialogTitle>
          <DialogDescription>
            Are you sure you want to activate <strong>{dj.name}</strong>? They will appear as an option when assigning
            DJs to new events.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={activateMutation.isPending}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleActivate} disabled={activateMutation.isPending}>
            {activateMutation.isPending ? "Activating..." : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
