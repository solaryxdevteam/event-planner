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
import type { EventWithRelations } from "@/lib/data-access/events.dal";

interface DraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDraft: EventWithRelations | null;
  onContinue: () => void;
  onStartNew: () => void;
  hasUserStarted: boolean;
}

export function DraftDialog({
  open,
  onOpenChange,
  existingDraft,
  onContinue,
  onStartNew,
  hasUserStarted,
}: DraftDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing by clicking outside or ESC - user must choose an option
    if (!newOpen && !hasUserStarted) {
      // If user tries to close without choosing, force them to choose
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Continue Existing Draft?</DialogTitle>
          <DialogDescription>
            You have an existing draft event. Would you like to continue editing it or start a new one?
          </DialogDescription>
        </DialogHeader>
        {existingDraft && (
          <div className="py-4 space-y-2">
            <p className="text-sm font-medium">{existingDraft.title || "Untitled Event"}</p>
            {existingDraft.notes && <p className="text-sm text-muted-foreground line-clamp-2">{existingDraft.notes}</p>}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onStartNew}>
            Start New
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
