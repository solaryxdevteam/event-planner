/**
 * Modification Versions List Component
 *
 * Displays list of modification versions for an event
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Eye, FileEdit, Plus, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ModificationVersionDialog } from "@/components/events/ModificationVersionDialog";
import type { EventVersion } from "@/lib/types/database.types";
import { useApproveEvent, useRejectEvent, useEventApprovals } from "@/lib/hooks/use-approvals";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";

interface ModificationVersionsListProps {
  versions: EventVersion[];
  isLoading: boolean;
  eventId: string;
  onRequestModification?: () => void;
  canRequestModification?: boolean;
  hasPendingModification?: boolean;
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

export function ModificationVersionsList({
  versions,
  isLoading,
  eventId,
  onRequestModification,
  canRequestModification = false,
  hasPendingModification = false,
}: ModificationVersionsListProps) {
  const router = useRouter();
  const [viewingVersion, setViewingVersion] = useState<EventVersion | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState<EventVersion | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState<EventVersion | null>(null);
  const [comment, setComment] = useState("");

  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;

  // Fetch event approvals to check if user has pending approval for modifications
  const { data: approvals } = useEventApprovals(eventId);

  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();

  // Check if the current user has a pending approval for a modification version
  const hasPendingApproval = () => {
    if (!profile?.id || !approvals) return false;
    return approvals.some(
      (a: { approval_type?: string; approver_id?: string; status?: string }) =>
        a.approval_type === "modification" &&
        a.approver_id === profile.id &&
        (a.status === "pending" || (a.status === "waiting" && isGlobalDirector))
    );
  };

  const handleApprove = async (version: EventVersion) => {
    if (!comment.trim() || !version.event_id) return;
    try {
      await approveMutation.mutateAsync({ eventId: version.event_id, comment });
      setShowApproveDialog(null);
      setComment("");
      router.refresh();
    } catch (error) {
      console.error("Error approving modification:", error);
    }
  };

  const handleReject = async (version: EventVersion) => {
    if (!comment.trim() || !version.event_id) return;
    try {
      await rejectMutation.mutateAsync({ eventId: version.event_id, comment });
      setShowRejectDialog(null);
      setComment("");
      router.refresh();
    } catch (error) {
      console.error("Error rejecting modification:", error);
    }
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modification Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modification Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No modification versions found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Modification Versions</CardTitle>
            {canRequestModification && onRequestModification && (
              <Button onClick={onRequestModification} disabled={hasPendingModification} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {hasPendingModification ? "Modification Pending" : "Request Modification"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">v{version.version_number}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusColors[version.status] || "bg-gray-500"} text-white border-0`}
                    >
                      {statusLabels[version.status] || version.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(version.created_at), "PPp")}</TableCell>
                  <TableCell className="max-w-xs truncate">{version.change_reason || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {version.status === "in_review" && hasPendingApproval() && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectDialog(version)}
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setShowApproveDialog(version)}
                            disabled={isSubmitting}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setViewingVersion(version)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View More
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewingVersion && (
        <ModificationVersionDialog
          open={!!viewingVersion}
          onOpenChange={(open: boolean) => !open && setViewingVersion(null)}
          version={viewingVersion}
          eventId={eventId}
        />
      )}

      {/* Approve Dialog */}
      <Dialog open={!!showApproveDialog} onOpenChange={(open) => !open && setShowApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Modification</DialogTitle>
            <DialogDescription>
              {isGlobalDirector ? (
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
                setShowApproveDialog(null);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => showApproveDialog && handleApprove(showApproveDialog)}
              disabled={!comment.trim() || isSubmitting}
            >
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
      <Dialog open={!!showRejectDialog} onOpenChange={(open) => !open && setShowRejectDialog(null)}>
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
                setShowRejectDialog(null);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRejectDialog && handleReject(showRejectDialog)}
              disabled={!comment.trim() || isSubmitting}
            >
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
