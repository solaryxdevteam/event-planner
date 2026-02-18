/**
 * Modification Version Dialog Component
 *
 * Shows version details with approve/reject actions
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, FileText, Users, Banknote } from "lucide-react";
import { format } from "date-fns";
import { useApproveEvent, useRejectEvent } from "@/lib/hooks/use-approvals";
import { useEventApprovals } from "@/lib/hooks/use-approvals";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import type { EventVersion } from "@/lib/types/database.types";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { Loader2 } from "lucide-react";

interface ModificationVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: EventVersion;
  eventId: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  in_review: "bg-blue-500",
  rejected: "bg-red-500",
  approved_scheduled: "bg-green-500",
  completed_awaiting_report: "bg-yellow-500",
  completed_archived: "bg-slate-500",
  cancelled: "bg-orange-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  rejected: "Rejected",
  approved_scheduled: "Approved",
  completed_awaiting_report: "Awaiting Report",
  completed_archived: "Archived",
  cancelled: "Cancelled",
};

type VersionData = {
  title: string;
  starts_at: string;
  venue_id: string | null;
  expected_attendance: number | null;
  minimum_ticket_price: number | null;
  minimum_table_price: number | null;
  notes: string | null;
};

export function ModificationVersionDialog({ open, onOpenChange, version, eventId }: ModificationVersionDialogProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState("");

  const { data: profile } = useProfile();
  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();
  const { data: approvals } = useEventApprovals(eventId);

  // Only show approve/reject when it is the user's turn (status = "pending"). No bypass for Global Director.
  const hasPendingApproval = approvals?.some(
    (a: EventApprovalWithApprover) =>
      a.approval_type === "modification" && a.approver_id === profile?.id && a.status === "pending"
  );

  const canApproveReject = version.status === "in_review" && hasPendingApproval;

  const versionData = version.version_data as VersionData;
  const startsAt = versionData.starts_at ? new Date(versionData.starts_at) : null;

  const handleApprove = async () => {
    if (!comment.trim()) {
      return;
    }
    try {
      await approveMutation.mutateAsync({ eventId, comment });
      setShowApproveDialog(false);
      setComment("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error approving:", error);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      return;
    }
    try {
      await rejectMutation.mutateAsync({ eventId, comment });
      setShowRejectDialog(false);
      setComment("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting:", error);
    }
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <Dialog open={open && !showApproveDialog && !showRejectDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Modification Version v{version.version_number}</span>
              <Badge
                variant="outline"
                className={`${statusColors[version.status] || "bg-gray-500"} text-white border-0`}
              >
                {statusLabels[version.status] || version.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>Created on {format(new Date(version.created_at), "PPp")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Change Reason */}
            {version.change_reason && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Change Reason</h3>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{version.change_reason}</p>
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Version Details</h3>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <p className="text-sm font-medium">{versionData.title}</p>
              </div>

              {/* Notes */}
              {versionData.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{versionData.notes}</p>
                </div>
              )}

              {/* Start Date and Time */}
              {startsAt && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label>Start Date & Time</Label>
                  </div>
                  <p className="text-sm">{format(startsAt, "PPp")}</p>
                </div>
              )}

              {/* Expected Attendance */}
              {versionData.expected_attendance && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label>Expected Attendance</Label>
                  </div>
                  <p className="text-sm font-medium">{versionData.expected_attendance.toLocaleString()}</p>
                </div>
              )}

              {/* Min prices */}
              {(versionData.minimum_ticket_price != null || versionData.minimum_table_price != null) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {versionData.minimum_ticket_price != null && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <Label>Min. ticket price</Label>
                      </div>
                      <p className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                          Number(versionData.minimum_ticket_price)
                        )}
                      </p>
                    </div>
                  )}
                  {versionData.minimum_table_price != null && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <Label>Min. table price</Label>
                      </div>
                      <p className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                          Number(versionData.minimum_table_price)
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canApproveReject && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Modification</DialogTitle>
            <DialogDescription>
              {profile?.role === UserRole.GLOBAL_DIRECTOR ? (
                <>
                  <span className="block mb-2">
                    As a <strong>Global Director</strong>, your approval will immediately finalize this modification,
                    bypassing any remaining approvers in the chain.
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
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Modification</DialogTitle>
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
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
