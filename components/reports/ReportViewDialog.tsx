/**
 * Report View Dialog Component
 *
 * Shows full report details in a dialog
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, ExternalLink, Calendar, Users, Banknote, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import type { Report } from "@/lib/types/database.types";
import { useApproveEvent, useRejectEvent, useEventApprovals } from "@/lib/hooks/use-approvals";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

interface ReportViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report;
  eventTitle: string;
  eventId: string;
  onApprove?: () => void;
  onReject?: () => void;
  canApproveReject?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function ReportViewDialog({
  open,
  onOpenChange,
  report,
  eventTitle,
  eventId,
  onApprove: _onApprove, // eslint-disable-line @typescript-eslint/no-unused-vars
  onReject: _onReject, // eslint-disable-line @typescript-eslint/no-unused-vars
  canApproveReject = false,
}: ReportViewDialogProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpAction, setOtpAction] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: "image" | "video" | "file";
    name: string;
  } | null>(null);

  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;
  const approveMutation = useApproveEvent();
  const rejectMutation = useRejectEvent();

  // Fetch approval records to get rejection comment
  const { data: approvals } = useEventApprovals(eventId);

  // Find the rejection comment from Global Director for this report
  const rejectionComment = approvals?.find(
    (a: EventApprovalWithApprover) =>
      a.approval_type === "report" &&
      a.status === "rejected" &&
      a.comment &&
      a.approver?.role === UserRole.GLOBAL_DIRECTOR
  )?.comment;

  // Find the rejected approval record for display
  const rejectedApproval = approvals?.find(
    (a: EventApprovalWithApprover) =>
      a.approval_type === "report" && a.status === "rejected" && a.approver?.role === UserRole.GLOBAL_DIRECTOR
  );

  const handleApproveContinueToOtp = () => {
    if (!comment.trim()) return;
    setOtpAction("approve");
    setShowApproveDialog(false);
    setShowOtpDialog(true);
  };

  const handleRejectContinueToOtp = () => {
    if (!comment.trim()) return;
    setOtpAction("reject");
    setShowRejectDialog(false);
    setShowOtpDialog(true);
  };

  const handleOtpVerified = async (verificationToken: string) => {
    setShowOtpDialog(false);
    try {
      if (otpAction === "approve") {
        await approveMutation.mutateAsync({ eventId, comment, verificationToken });
        setShowApproveDialog(false);
      } else {
        await rejectMutation.mutateAsync({ eventId, comment, verificationToken });
        setShowRejectDialog(false);
      }
      setComment("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error with report approval action:", error);
    }
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <Dialog open={open && !showApproveDialog && !showRejectDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between mt-3">
              <span>Post-Event Report</span>
              <Badge variant="outline" className={`${statusColors[report.status]} text-white border-0`}>
                {statusLabels[report.status]}
              </Badge>
            </DialogTitle>
            <DialogDescription>{eventTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Report Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-sm font-medium">{format(new Date(report.created_at), "PPp")}</p>
                </div>
              </div>
              {report.updated_at !== report.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">{format(new Date(report.updated_at), "PPp")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Attendance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Attendance</h3>
                </div>
                <p className="text-2xl font-bold">{report.attendance_count.toLocaleString()}</p>
              </div>

              {/* Table sales */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Table sales</h3>
                </div>
                <p className="text-2xl font-bold">
                  {report.total_table_sales != null
                    ? Number(report.total_table_sales).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>

              {/* Ticket sales */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Ticket sales</h3>
                </div>
                <p className="text-2xl font-bold">
                  {report.total_ticket_sales != null
                    ? Number(report.total_ticket_sales).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>

              {/* Bar sales */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Bar sales</h3>
                </div>
                <p className="text-2xl font-bold">
                  {report.total_bar_sales != null
                    ? Number(report.total_bar_sales).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Feedback */}
            {report.feedback && (
              <div className="space-y-2">
                <h3 className="font-semibold">Feedback</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.feedback}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {report.status === "rejected" && rejectionComment && (
              <div className="space-y-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Rejection Reason</h3>
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">{rejectionComment}</p>
                {rejectedApproval?.approver && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                    Rejected by: {rejectedApproval.approver.name || "Global Director"}
                  </p>
                )}
              </div>
            )}

            {/* Media Files */}
            {report.media_urls && report.media_urls.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Media Files</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.media_urls.map((url, index) => {
                    const fileName = url.split("/").pop() || `media-${index + 1}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                    const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(fileName);
                    const mediaType: "image" | "video" | "file" = isImage ? "image" : isVideo ? "video" : "file";

                    return (
                      <div key={index} className="space-y-2">
                        <button
                          type="button"
                          className="relative aspect-video w-full bg-muted rounded overflow-hidden border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                          onClick={() => setPreviewMedia({ url, type: mediaType, name: fileName })}
                        >
                          {isImage ? (
                            <Image src={url} alt={`Media ${index + 1}`} fill className="object-cover" unoptimized />
                          ) : isVideo ? (
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">File</span>
                            </div>
                          )}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = fileName;
                            link.target = "_blank";
                            link.click();
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* External Links */}
            {report.external_links && report.external_links.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">External Links</h3>
                <div className="space-y-2">
                  {report.external_links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canApproveReject && report.status === "pending" && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
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
            <DialogTitle>Approve Report</DialogTitle>
            <DialogDescription>
              {isGlobalDirector ? (
                <>
                  <span className="block mb-2">
                    As a <strong>Global Director</strong>, when it is your turn your approval will finalize this report
                    and archive the event. You cannot bypass the approval chain.
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
            <Button onClick={handleApproveContinueToOtp} disabled={!comment.trim() || isSubmitting}>
              Continue to verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
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
            <Button
              variant="destructive"
              onClick={handleRejectContinueToOtp}
              disabled={!comment.trim() || isSubmitting}
            >
              Continue to verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpVerificationDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        onVerified={handleOtpVerified}
        contextType="event_approval"
        contextId={eventId}
        action={otpAction}
        title="Verify with OTP"
        description="We sent a 4-digit code to your email. Enter it below to confirm your decision."
      />

      <MediaPreviewDialog
        open={previewMedia != null}
        onOpenChange={(open) => !open && setPreviewMedia(null)}
        type={previewMedia?.type ?? "image"}
        url={previewMedia?.url ?? ""}
        downloadName={previewMedia?.name}
      />
    </>
  );
}
