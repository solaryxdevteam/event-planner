"use client";

import { format } from "date-fns";
import { CheckCircle2, XCircle, User, AlertCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, UserRole } from "@/lib/types/roles";
import type { EventApprovalWithApprover } from "@/lib/data-access/event-approvals.dal";
import type { ApprovalType } from "@/lib/types/database.types";

interface ApprovalChainTimelineProps {
  approvals: EventApprovalWithApprover[];
  className?: string;
  showComments?: boolean;
  showTimestamps?: boolean;
  compact?: boolean;
}

type ApprovalStatus = "waiting" | "pending" | "approved" | "rejected";

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  event: "Event Approval",
  modification: "Modification Approval",
  cancellation: "Cancellation Approval",
  report: "Report Approval",
};

/**
 * ApprovalChainTimeline Component
 *
 * Displays grouped horizontal timelines of the approval chain showing:
 * - Grouped by approval type (event, modification, cancellation, report)
 * - Role and name of each approver
 * - Current status (waiting, pending, approved, rejected)
 * - Optional: comments and timestamps
 *
 * @example
 * ```tsx
 * <ApprovalChainTimeline
 *   approvals={approvalChain}
 *   showComments={true}
 *   showTimestamps={true}
 * />
 * ```
 */
export function ApprovalChainTimeline({
  approvals,
  className = "",
  showComments = false,
  showTimestamps = false,
  compact = false,
}: ApprovalChainTimelineProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">No approval chain found</span>
        </div>
      </div>
    );
  }

  // Group approvals by approval_type
  const groupedApprovals = approvals.reduce(
    (acc, approval) => {
      const type = approval.approval_type || "event";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(approval);
      return acc;
    },
    {} as Record<ApprovalType, EventApprovalWithApprover[]>
  );

  // Sort each group by sequence_order
  Object.keys(groupedApprovals).forEach((type) => {
    groupedApprovals[type as ApprovalType].sort((a, b) => a.sequence_order - b.sequence_order);
  });

  // Define the order of approval types
  const approvalTypeOrder: ApprovalType[] = ["event", "modification", "cancellation", "report"];

  // Filter out empty groups and get the groups that will be rendered
  const groupsToRender = approvalTypeOrder
    .map((type) => ({
      type,
      approvals: groupedApprovals[type],
    }))
    .filter((group) => group.approvals && group.approvals.length > 0);

  const hasMultipleGroups = groupsToRender.length > 1;

  return (
    <div className={className}>
      <div className="space-y-4">
        {groupsToRender.map((group, groupIndex) => {
          const isNotLastGroup = groupIndex < groupsToRender.length - 1;

          return (
            <div key={group.type}>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">{APPROVAL_TYPE_LABELS[group.type]}</h3>
                <TimelineGroup
                  approvals={group.approvals}
                  showComments={showComments}
                  showTimestamps={showTimestamps}
                  compact={true}
                />
              </div>
              {/* Dashed separator line between groups */}
              {hasMultipleGroups && isNotLastGroup && (
                <div className="my-4 border-t border-dashed border-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * TimelineGroup Component
 * Renders a single horizontal timeline for a group of approvals
 */
function TimelineGroup({
  approvals,
  showComments,
  showTimestamps,
  compact,
}: {
  approvals: EventApprovalWithApprover[];
  showComments: boolean;
  showTimestamps: boolean;
  compact: boolean;
}) {
  return (
    <div className="relative overflow-x-auto pb-3">
      <div className="relative min-w-full">
        <div className="relative flex items-start gap-3 sm:gap-4">
          {approvals.map((approval, index) => {
            const isLast = index === approvals.length - 1;
            const status = approval.status as ApprovalStatus;
            const roleLabel = approval.approver?.role
              ? ROLE_LABELS[approval.approver.role as UserRole] || approval.approver.role
              : "Unknown Role";
            const isCurrent = status === "pending";

            return (
              <div key={approval.id} className="relative flex min-w-[140px] max-w-[180px] flex-col items-stretch pl-1">
                {/* Connector line from this circle to the next (only if not last) */}
                {!isLast && (
                  <div
                    className="pointer-events-none absolute z-0 h-0.5 bg-muted"
                    style={{
                      left: "10px", // Center of circle (h-5 w-5 = 20px, center = 10px)
                      top: "10px", // Center of circle vertically (20px / 2 = 10px)
                      width: "calc(100% - 10px + 0.75rem + 10px)", // From center of this circle to center of next circle (gap-3 = 0.75rem)
                    }}
                  />
                )}

                {/* Timeline rail + status icon */}
                <div className="relative z-10 flex items-center justify-start">
                  <div className="relative z-10">
                    <StatusIcon status={status} />
                  </div>
                </div>

                {/* Content card for this action */}
                <div
                  className={`
                    relative z-10 mt-2 rounded-lg border bg-card p-2 shadow-sm
                    transition-transform transition-shadow
                    ${isCurrent ? "ring-2 ring-blue-500/60 shadow-md" : ""}
                  `}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <Badge variant="outline" className="text-[9px] whitespace-nowrap px-1.5 py-0">
                      {roleLabel}
                    </Badge>
                    <StatusBadge status={status} />
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <User className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-medium">{approval.approver?.name || "Unknown User"}</span>
                  </div>

                  {showTimestamps && approval.updated_at && status !== "waiting" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(approval.updated_at), "MMM d, HH:mm")}
                    </p>
                  )}

                  {showComments && approval.comment && (
                    <div className="mt-1.5 rounded-md bg-muted/70 p-1.5">
                      <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">Comment</p>
                      <p className="text-[10px] text-foreground whitespace-pre-wrap line-clamp-2">{approval.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Status Icon Component
 */
function StatusIcon({ status }: { status: ApprovalStatus }) {
  const baseClasses = "h-5 w-5 rounded-full flex items-center justify-center border transition-colors flex-shrink-0";

  switch (status) {
    case "approved":
      return (
        <div
          className={`${baseClasses} bg-green-50 border-green-500 text-green-600 dark:bg-green-950 dark:border-green-400 dark:text-green-300`}
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
        </div>
      );
    case "rejected":
      return (
        <div
          className={`${baseClasses} bg-red-50 border-red-500 text-red-600 dark:bg-red-950 dark:border-red-400 dark:text-red-300`}
        >
          <XCircle className="h-2.5 w-2.5" />
        </div>
      );
    case "pending":
      return (
        <div
          className={`${baseClasses} bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950 dark:border-blue-400 dark:text-blue-300`}
        >
          <Circle className="h-2.5 w-2.5 fill-blue-600 text-blue-600" />
        </div>
      );
    case "waiting":
    default:
      return (
        <div className={`${baseClasses} bg-muted border-muted-foreground/30 text-muted-foreground`}>
          <Circle className="h-2.5 w-2.5" />
        </div>
      );
  }
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: ApprovalStatus }) {
  const statusConfig = {
    approved: {
      label: "Approved",
      variant: "default" as const,
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200",
    },
    rejected: { label: "Rejected", variant: "destructive" as const, className: "" },
    pending: {
      label: "Pending",
      variant: "secondary" as const,
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200",
    },
    waiting: { label: "Waiting", variant: "outline" as const, className: "bg-muted text-muted-foreground" },
  };

  const config = statusConfig[status] || statusConfig.waiting;

  return (
    <Badge
      variant={config.variant}
      className={`text-[9px] w-fit px-1.5 py-0 ${config.className} pointer-events-none hover:bg-inherit hover:opacity-100`}
    >
      {config.label}
    </Badge>
  );
}
