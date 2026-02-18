"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVenueApprovalChain } from "@/lib/hooks/use-approvals";
import type { VenueApprovalWithApprover } from "@/lib/data-access/venue-approvals.dal";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import Link from "next/link";

interface PendingVenueApprovalCardProps {
  approval: VenueApprovalWithApprover;
  onApprove: (venueId: string, comment: string, verificationToken: string) => Promise<void>;
  onReject: (venueId: string, comment: string, verificationToken: string) => Promise<void>;
}

/** Transform venue approval to the shape ApprovalChainTimeline expects (event approval shape) for display */
function venueApprovalsToTimelineShape(
  approvals: VenueApprovalWithApprover[]
): Array<VenueApprovalWithApprover & { approval_type?: string }> {
  return approvals.map((a) => ({ ...a, approval_type: "event" }));
}

export function PendingVenueApprovalCard({ approval, onApprove, onReject }: PendingVenueApprovalCardProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpAction, setOtpAction] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const venue = approval.venue;
  const { data: approvalsForVenue = [] } = useVenueApprovalChain(approval.venue_id);

  const submissionDate = venue?.created_at ? format(new Date(venue.created_at), "MMM d, yyyy • h:mm a") : null;

  const creatorInitials = venue?.creator?.name
    ? venue.creator.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleApproveClick = () => {
    if (!comment.trim()) return;
    setOtpAction("approve");
    setShowApproveDialog(false);
    setShowOtpDialog(true);
  };

  const handleRejectClick = () => {
    if (!comment.trim()) return;
    setOtpAction("reject");
    setShowRejectDialog(false);
    setShowOtpDialog(true);
  };

  const handleOtpVerified = async (verificationToken: string) => {
    setIsSubmitting(true);
    try {
      if (otpAction === "approve") {
        await onApprove(approval.venue_id, comment, verificationToken);
      } else {
        await onReject(approval.venue_id, comment, verificationToken);
      }
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shortId = venue?.short_id;
  const venueLink = shortId ? `/dashboard/venues/${shortId}/edit` : "#";

  return (
    <>
      <Card className="hover:shadow-md transition-shadow py-2">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_2fr] md:items-stretch">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide border-amber-500 text-amber-700 bg-amber-50"
                >
                  Venue request
                </Badge>
                {submissionDate && <span className="text-xs text-muted-foreground">Submitted {submissionDate}</span>}
              </div>
              <h3 className="text-lg font-semibold leading-snug">{venue?.name || "Unnamed Venue"}</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {(venue?.city || venue?.country) && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{[venue?.city, venue?.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
              {venue?.creator && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">{creatorInitials}</span>
                  </div>
                  <span>{venue.creator.name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              {approvalsForVenue.length > 0 ? (
                <ApprovalChainTimeline
                  approvals={venueApprovalsToTimelineShape(approvalsForVenue) as unknown as EventApprovalWithApprover[]}
                  showTimestamps
                  compact
                  className="-mx-1"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Approval chain</p>
              )}
              <div className="w-full flex flex-wrap gap-2">
                <Button className="w-full" variant="outline" size="sm" asChild>
                  <Link href={venueLink}>
                    <Building2 className="h-4 w-4 mr-2" />
                    View venue
                  </Link>
                </Button>

                {/* <Button size="sm" onClick={() => setShowApproveDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button> */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve venue</DialogTitle>
            <DialogDescription>
              Add a comment for the approval. This will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">Comment</Label>
            <Textarea
              id="approve-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveClick} disabled={!comment.trim() || isSubmitting}>
              {isSubmitting ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject venue</DialogTitle>
            <DialogDescription>
              A comment is required when rejecting. The creator will not see this comment in the UI unless you add that
              feature later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-comment">Comment (required)</Label>
            <Textarea
              id="reject-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectClick} disabled={!comment.trim() || isSubmitting}>
              Continue to verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpVerificationDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        onVerified={handleOtpVerified}
        contextType="venue_approval"
        contextId={approval.venue_id}
        action={otpAction}
        title="Verify with OTP"
        description="We sent a 4-digit code to your email. Enter it below to confirm your decision."
      />
    </>
  );
}
