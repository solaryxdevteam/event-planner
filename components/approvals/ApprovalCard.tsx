"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Calendar, Clock, User, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import { useEventApprovals } from "@/lib/hooks/use-approvals";

interface ApprovalCardProps {
  approval: any;
  onApprove: (eventId: string, comment: string) => Promise<void>;
  onReject: (eventId: string, comment: string) => Promise<void>;
  userRole?: string;
}

export function ApprovalCard({ approval, onApprove, onReject, userRole }: ApprovalCardProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = approval.event;

  // Fetch full approval chain for this event
  const { data: approvals, isLoading: loadingApprovals } = useEventApprovals(approval.event_id);

  const handleApprove = async () => {
    if (!comment.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onApprove(approval.event_id, comment);
      setShowApproveDialog(false);
      setComment("");
    } catch (error) {
      console.error("Error approving:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(approval.event_id, comment);
      setShowRejectDialog(false);
      setComment("");
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApprovalTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      event: { label: "Event", variant: "default" },
      modification: { label: "Modification", variant: "secondary" },
      cancellation: { label: "Cancellation", variant: "destructive" },
      report: { label: "Report", variant: "outline" },
    };

    const badge = badges[type] || badges.event;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{event?.title || "Untitled Event"}</CardTitle>
              <CardDescription>Approval #{approval.sequence_order} in chain</CardDescription>
            </div>
            {getApprovalTypeBadge(approval.approval_type)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {event?.starts_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(event.starts_at), "PPP")}</span>
              </div>
            )}
            {event?.starts_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(event.starts_at), "p")}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{event?.status}</Badge>
            </div>
          </div>

          {/* Approval Chain Timeline */}
          {loadingApprovals ? (
            <Skeleton className="h-24 w-full mt-4" />
          ) : approvals && approvals.length > 0 ? (
            <div className="mt-4">
              <ApprovalChainTimeline approvals={approvals} showComments={false} showTimestamps={false} compact={true} />
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="default" className="flex-1" onClick={() => setShowApproveDialog(true)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => setShowRejectDialog(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </CardFooter>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Event</DialogTitle>
            <DialogDescription>
              {userRole === "global_director" ? (
                <>
                  <span className="block mb-2">
                    As a <strong>Global Director</strong>, your approval will immediately finalize this event, bypassing
                    any remaining approvers in the chain.
                  </span>
                  <span>
                    Please provide a comment for your approval decision. This will be recorded in the audit log.
                  </span>
                </>
              ) : (
                "Please provide a comment for your approval decision. This will be recorded in the audit log."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-comment">Comment *</Label>
              <Textarea
                id="approve-comment"
                placeholder="Enter your approval comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={!comment.trim() || isSubmitting}>
              {isSubmitting ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be recorded in the audit log and the event creator will
              be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Reason for Rejection *</Label>
              <Textarea
                id="reject-comment"
                placeholder="Enter your rejection reason..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!comment.trim() || isSubmitting}>
              {isSubmitting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
