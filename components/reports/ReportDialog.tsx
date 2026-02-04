/**
 * Report Dialog Component
 *
 * Dialog wrapper for ReportForm
 */

"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportForm } from "./ReportForm";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  event: EventWithRelations;
}

export function ReportDialog({ open, onOpenChange, eventId, event }: ReportDialogProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[600px] w-full max-h-[95vh] overflow-y-auto p-0 gap-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-2xl">Submit Post-Event Report</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Fill out the post-event report for <span className="font-semibold text-foreground">{event.title}</span>
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-4">
          <ReportForm eventId={eventId} event={event} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
