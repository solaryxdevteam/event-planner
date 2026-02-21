"use client";

export const dynamic = "force-dynamic";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVenueByShortId } from "@/lib/hooks/use-venues";
import { VenueForm } from "@/components/venues/VenueForm";
import { DeleteVenueDialog } from "@/components/venues/DeleteVenueDialog";
import { BanVenueDialog } from "@/components/venues/BanVenueDialog";
import { UnbanVenueDialog } from "@/components/venues/UnbanVenueDialog";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { BanIcon, TrashIcon, CheckCircle2 } from "lucide-react";
import { useVenueApprovals, useVenueApprovalChain, useApproveVenue, useRejectVenue } from "@/lib/hooks/use-approvals";
import { ApprovalChainTimeline } from "@/components/approvals/ApprovalChainTimeline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EditVenuePageProps {
  params: Promise<{ id: string }>;
}

export default function EditVenuePage({ params }: EditVenuePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const shortId = resolvedParams.id;

  // All hooks must be called before any conditional returns
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpAction, setOtpAction] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  // Fetch venue using React Query
  const { data: venue, isLoading: loading, error } = useVenueByShortId(shortId);
  const { data: venueApprovalChain = [] } = useVenueApprovalChain(venue?.id);
  const { data: venueApprovals = [] } = useVenueApprovals();
  const approveVenueMutation = useApproveVenue();
  const rejectVenueMutation = useRejectVenue();

  // Get user profile for role check (edit: anyone who can load the venue can edit; delete/ban: role-based)
  const { data: profile } = useProfile();
  const isGlobalDirector = profile?.role === UserRole.GLOBAL_DIRECTOR;
  const isEventPlanner = profile?.role === UserRole.EVENT_PLANNER;
  const canDelete = isGlobalDirector || isEventPlanner;

  if (loading) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="container mx-auto pt-4 pb-8 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">Venue not found</p>
        </div>
      </div>
    );
  }

  const handleDeleteSuccess = () => {
    router.push("/dashboard/venues");
  };

  const handleBanSuccess = () => {
    router.push("/dashboard/venues");
  };

  // While approve/reject is in progress, show skeleton for timeline and disable buttons
  const isApprovalActionPending =
    isSubmittingApproval || approveVenueMutation.isPending || rejectVenueMutation.isPending;

  // Current user can approve only when it is their turn (their approval row has status "pending", not "waiting").
  // Global Directors must not bypass the chain—they only see Approve when their step is pending.
  const canApproveThisVenue =
    venue &&
    venue.approval_status === "pending" &&
    (venueApprovals as { venue_id: string; status: string }[]).some(
      (a) => a.venue_id === venue.id && a.status === "pending"
    );

  const handleApproveClick = () => {
    if (!comment.trim() || !venue) return;
    setOtpAction("approve");
    setShowApproveDialog(false);
    setShowOtpDialog(true);
  };

  const handleRejectClick = () => {
    if (!comment.trim() || !venue) return;
    setOtpAction("reject");
    setShowRejectDialog(false);
    setShowOtpDialog(true);
  };

  const handleOtpVerified = async (verificationToken: string) => {
    if (!venue) return;
    setIsSubmittingApproval(true);
    try {
      if (otpAction === "approve") {
        await approveVenueMutation.mutateAsync({
          venueId: venue.id,
          comment,
          verificationToken,
        });
      } else {
        await rejectVenueMutation.mutateAsync({
          venueId: venue.id,
          comment,
          verificationToken,
        });
      }
      setComment("");
      setShowOtpDialog(false);
      router.refresh();
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="container mx-auto pt-4 pb-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
              {venue.short_id && (
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {venue.short_id}
                </span>
              )}
              {venue.contact_email_verified && (
                <Badge variant="secondary" className="py-1 rounded-sm text-sm gap-1.5 font-normal">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Contact email verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">Update the venue information step by step</p>
          </div>
        </div>
      </div>

      <VenueForm
        mode="edit"
        venue={venue}
        defaultCountry={venue.country || "United States"}
        defaultCountryId={venue.country_id || undefined}
      />

      {/* Creator information */}
      {venue.creator && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Creator</h3>
          <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
            <Avatar className="h-12 w-12 shrink-0">
              {venue.creator.avatar_url ? (
                <AvatarImage src={venue.creator.avatar_url} alt={venue.creator.name} />
              ) : null}
              <AvatarFallback className="text-base bg-muted">
                {(venue.creator.name && venue.creator.name.charAt(0).toUpperCase()) || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium truncate">{venue.creator.name}</p>
              <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                <a
                  href={`mailto:${venue.creator.email}`}
                  className="flex items-center gap-2 truncate hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{venue.creator.email}</span>
                </a>
                {venue.creator.phone ? (
                  <a
                    href={`tel:${venue.creator.phone}`}
                    className="flex items-center gap-2 truncate hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{venue.creator.phone}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send contact verification email */}
      {venue.contact_email && !venue.contact_email_verified && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Contact email verification</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Send a verification email to {venue.contact_email}. The contact can verify and this venue will show a
            verified badge.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isSendingVerification}
            onClick={async () => {
              setIsSendingVerification(true);
              try {
                const res = await fetch(`/api/venues/${venue.id}/send-contact-verification`, { method: "POST" });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || "Failed to send");
                }
                toast.success("Verification email sent. The contact will receive a link and code to verify.");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to send verification email");
              } finally {
                setIsSendingVerification(false);
              }
            }}
          >
            {isSendingVerification ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Sending...
              </>
            ) : (
              "Send verification email"
            )}
          </Button>
        </div>
      )}

      {/* Approval chain – loading handled inside ApprovalChainTimeline */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Approval chain</h3>
        <ApprovalChainTimeline
          approvals={venueApprovalChain}
          approvalKind="venue"
          showTimestamps
          compact
          className="-mx-1"
          isLoading={isApprovalActionPending}
        />
      </div>

      {/* Approve / Reject (when venue is pending and current user is approver) */}
      {canApproveThisVenue && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Venue approval</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowApproveDialog(true)} disabled={isApprovalActionPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              disabled={isApprovalActionPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Delete and Ban Actions – only when venue is established (approved/rejected), not right after create (pending) */}
      {venue.approval_status !== "pending" && (
        <div className="mt-6 pt-6 border-t flex gap-2 justify-end">
          {isGlobalDirector && !venue.is_active && (
            <Button variant="default" onClick={() => setUnbanDialogOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Unban Venue
            </Button>
          )}
          {isGlobalDirector && venue.is_active && (
            <Button variant="outline" onClick={() => setBanDialogOpen(true)}>
              <BanIcon className="mr-2 h-4 w-4" />
              Ban Venue
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete Venue
            </Button>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <DeleteVenueDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        venue={venue}
        onSuccess={handleDeleteSuccess}
      />

      {/* Ban Dialog */}
      {isGlobalDirector && venue.is_active && (
        <BanVenueDialog
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          venue={venue}
          onSuccess={handleBanSuccess}
        />
      )}

      {/* Unban Dialog */}
      {isGlobalDirector && !venue.is_active && (
        <UnbanVenueDialog
          open={unbanDialogOpen}
          onOpenChange={setUnbanDialogOpen}
          venue={venue}
          onSuccess={() => {
            // React Query will automatically refetch
          }}
        />
      )}

      {/* Approve venue dialog */}
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
            <Button onClick={handleApproveClick} disabled={!comment.trim() || isSubmittingApproval}>
              {isSubmittingApproval ? "Approving..." : "Continue to verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject venue dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject venue</DialogTitle>
            <DialogDescription>A comment is required when rejecting.</DialogDescription>
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
            <Button
              variant="destructive"
              onClick={handleRejectClick}
              disabled={!comment.trim() || isSubmittingApproval}
            >
              {isSubmittingApproval ? "Rejecting..." : "Continue to verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpVerificationDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        onVerified={handleOtpVerified}
        contextType="venue_approval"
        contextId={venue?.id ?? ""}
        action={otpAction}
        title="Verify with OTP"
        description="We sent a 4-digit code to your email. Enter it below to confirm your decision."
      />
    </div>
  );
}
