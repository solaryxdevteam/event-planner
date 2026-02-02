"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, MapPin, DollarSign, Users, CalendarDays, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEventApprovals } from "@/lib/hooks/use-approvals";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import { cn } from "@/lib/utils";

interface PendingApprovalCardProps {
  approval: any;
  onApprove: (eventId: string, comment: string) => Promise<void>;
  onReject: (eventId: string, comment: string) => Promise<void>;
  userRole?: string;
  isVertical?: boolean;
}

export function PendingApprovalCard({
  approval,
  onApprove,
  onReject,
  userRole,
  isVertical = false,
}: PendingApprovalCardProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = approval.event;

  // Fetch full approval chain for this event
  const { data: approvals, isLoading: loadingApprovals } = useEventApprovals(approval.event_id);

  // Determine approval type label for header
  const approvalType = approval.approval_type as EventApprovalWithApprover["approval_type"] | undefined;
  const approvalTypeLabel =
    approvalType === "modification"
      ? "Modification Request"
      : approvalType === "cancellation"
        ? "Cancellation Request"
        : approvalType === "report"
          ? "Report Review"
          : "Event Request";

  // Get submission date with time
  const submissionDate = event?.created_at ? format(new Date(event.created_at), "MMM d, yyyy • h:mm a") : null;

  // Event date & time
  const eventDateTime = event?.starts_at ? format(new Date(event.starts_at), "MMM d, yyyy • h:mm a") : null;

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

  // Determine if event is urgent (you can customize this logic)
  // const isUrgent = event?.starts_at
  //   ? new Date(event.starts_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
  //   : false;

  // Get creator initials
  const creatorInitials = event?.creator?.name
    ? event.creator.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
        <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
          <div
            className={cn(
              "flex flex-col flex-1",
              !isVertical ? "xl:grid xl:grid-cols-[1fr_2fr] xl:items-stretch gap-6 xl:gap-8" : "gap-6"
            )}
          >
            {/* Left: Event summary (1/3 width) */}
            <div className="flex flex-col space-y-4 min-w-0">
              {/* Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 uppercase tracking-wide",
                      approvalType === "modification" && "border-blue-500 text-blue-700 bg-blue-50",
                      approvalType === "cancellation" && "border-red-500 text-red-700 bg-red-50",
                      approvalType === "report" && "border-emerald-500 text-emerald-700 bg-emerald-50",
                      (!approvalType || approvalType === "event") && "border-violet-500 text-violet-700 bg-violet-50"
                    )}
                  >
                    {approvalTypeLabel}
                  </Badge>
                  {/* {isUrgent && (
                    <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-xs font-semibold">
                      Urgent
                    </Badge>
                  )} */}
                  {submissionDate && <span className="text-xs text-muted-foreground">Submitted {submissionDate}</span>}
                </div>
              </div>

              {/* Event summary */}
              <div className="space-y-3 flex-1">
                <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold leading-snug">
                  {event?.title || "Untitled Event"}
                </h3>

                {/* Primary event metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                  {eventDateTime && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{eventDateTime}</span>
                    </div>
                  )}
                  {event?.venue && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{event.venue.name}</span>
                    </div>
                  )}
                  {event?.budget_amount != null && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: event.budget_currency || "USD",
                          maximumFractionDigits: 0,
                        }).format(Number(event.budget_amount))}
                      </span>
                    </div>
                  )}
                </div>

                {event?.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>
                )}

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {/* Creator Avatar */}
                  {event?.creator && (
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{creatorInitials}</span>
                      </div>
                      <span>{event.creator.name}</span>
                    </div>
                  )}

                  {/* Expected Attendance */}
                  {event?.expected_attendance != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{event.expected_attendance} attendees</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Approval chain + Actions (2/3 width) */}
            <div
              className={cn(
                "flex flex-col space-y-3 min-w-0",
                !isVertical ? "xl:border-l xl:pl-6 xl:border-t-0 border-t pt-6 xl:pt-0" : "border-t pt-6"
              )}
            >
              {loadingApprovals ? (
                <Skeleton className="h-32 w-full" />
              ) : approvals && approvals.length > 0 ? (
                <ApprovalChainTimeline approvals={approvals} showTimestamps compact className="-mx-1" />
              ) : (
                <p className="text-sm text-muted-foreground">No approval chain found</p>
              )}

              {/* Action buttons after approval chain */}
              <div
                className={cn(
                  "w-full pt-2 border-t mt-auto flex-shrink-0",
                  isVertical ? "flex flex-col gap-2" : "flex flex-row gap-2"
                )}
              >
                <Button
                  variant="outline"
                  className={isVertical ? "w-full" : "flex-1"}
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  className={isVertical ? "w-full" : "flex-1"}
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    isVertical ? "w-full" : "flex-1",
                    "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  )}
                  disabled={!event?.short_id && !event?.id}
                  onClick={() => {
                    // Prefer short_id, but fall back to id if short_id is not available
                    const eventIdentifier = event?.short_id || event?.id;
                    if (!eventIdentifier) return;
                    router.push(`/dashboard/events/${eventIdentifier}`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View more
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
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
