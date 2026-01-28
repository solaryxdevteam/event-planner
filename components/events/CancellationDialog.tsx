/**
 * Cancellation Dialog Component
 *
 * Dialog for requesting event cancellation
 */

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRequestCancellation } from "@/lib/hooks/use-cancellations";
import { Loader2, AlertTriangle } from "lucide-react";

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function CancellationDialog({ open, onOpenChange, eventId, eventTitle }: CancellationDialogProps) {
  const [reason, setReason] = useState("");
  const requestCancellation = useRequestCancellation();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    try {
      await requestCancellation.mutateAsync({ eventId, reason: reason.trim() });
      setReason("");
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Request Event Cancellation
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will request cancellation for the event. The request will go through the approval chain and requires
            final approval from a Global Director.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-2">Event:</p>
            <p className="text-sm text-muted-foreground">{eventTitle}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for requesting cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{reason.length} / 1000 characters</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={requestCancellation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!reason.trim() || requestCancellation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {requestCancellation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Cancellation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
