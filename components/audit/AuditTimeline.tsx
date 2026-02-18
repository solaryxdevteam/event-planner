/**
 * Audit Timeline Component
 *
 * Displays audit log history as a vertical timeline with date separators
 */

"use client";

import { format, isToday, isYesterday } from "date-fns";
import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { AuditLogWithUser } from "@/lib/data-access/audit-logs.dal";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Edit,
  Ban,
  FileCheck,
  Clock,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const COLLAPSED_MAX_HEIGHT = "80vh";

interface AuditTimelineProps {
  logs: AuditLogWithUser[];
  isLoading?: boolean;
  /** When true, timeline is collapsed with max height and "Show more" when content overflows */
  collapsible?: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  submit_for_approval: <ArrowRight className="h-4 w-4" />,
  approve: <CheckCircle2 className="h-4 w-4" />,
  reject: <XCircle className="h-4 w-4" />,
  request_modification: <Edit className="h-4 w-4" />,
  approve_modification: <CheckCircle2 className="h-4 w-4" />,
  reject_modification: <XCircle className="h-4 w-4" />,
  request_cancellation: <Ban className="h-4 w-4" />,
  approve_cancellation: <CheckCircle2 className="h-4 w-4" />,
  reject_cancellation: <XCircle className="h-4 w-4" />,
  submit_report: <FileText className="h-4 w-4" />,
  approve_report: <FileCheck className="h-4 w-4" />,
  reject_report: <XCircle className="h-4 w-4" />,
  resubmit_report: <FileText className="h-4 w-4" />,
  update_event: <Edit className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  submit_for_approval: "bg-purple-500",
  approve: "bg-green-500",
  reject: "bg-red-500",
  request_modification: "bg-yellow-500",
  approve_modification: "bg-green-500",
  reject_modification: "bg-red-500",
  request_cancellation: "bg-orange-500",
  approve_cancellation: "bg-green-500",
  reject_cancellation: "bg-red-500",
  submit_report: "bg-blue-500",
  approve_report: "bg-green-500",
  reject_report: "bg-red-500",
  resubmit_report: "bg-blue-500",
  update_event: "bg-gray-500",
};

const actionLabels: Record<string, string> = {
  submit_for_approval: "Submitted for Approval",
  approve: "Approved",
  reject: "Rejected",
  request_modification: "Modification Requested",
  approve_modification: "Modification Approved",
  reject_modification: "Modification Rejected",
  request_cancellation: "Cancellation Requested",
  approve_cancellation: "Cancellation Approved",
  reject_cancellation: "Cancellation Rejected",
  submit_report: "Report Submitted",
  approve_report: "Report Approved",
  reject_report: "Report Rejected",
  resubmit_report: "Report Resubmitted",
  update_event: "Event Updated",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name[0].toUpperCase();
}

function formatDateHeader(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "d MMM yyyy");
}

interface TimelineEntry {
  log: AuditLogWithUser;
  dateKey: string;
  dateHeader: string;
}

export function AuditTimeline({ logs, isLoading, collapsible = false }: AuditTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [measuredOverflow, setMeasuredOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasOverflow = Boolean(collapsible && !historyExpanded && measuredOverflow);

  // Detect if timeline content overflows when collapsible and collapsed
  useEffect(() => {
    if (!collapsible || historyExpanded) return;
    const check = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      setMeasuredOverflow(content.scrollHeight > container.clientHeight);
    };
    const t = requestAnimationFrame(() => check());
    const ro = new ResizeObserver(check);
    const container = containerRef.current;
    if (container) ro.observe(container);
    return () => {
      cancelAnimationFrame(t);
      ro.disconnect();
    };
  }, [collapsible, historyExpanded, logs.length]);

  // Process logs: group by date and prepare timeline entries
  const timelineEntries = useMemo(() => {
    if (!logs.length) return [];

    // Sort by date (newest first)
    const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Group by date
    const entries: TimelineEntry[] = [];
    let currentDateKey = "";

    sortedLogs.forEach((log) => {
      const logDate = new Date(log.created_at);
      const dateKey = format(logDate, "yyyy-MM-dd");
      const dateHeader = formatDateHeader(logDate);

      if (dateKey !== currentDateKey) {
        currentDateKey = dateKey;
      }

      entries.push({
        log,
        dateKey,
        dateHeader,
      });
    });

    return entries;
  }, [logs]);

  // Group consecutive similar entries
  const groupedEntries = useMemo(() => {
    if (!timelineEntries.length) return [];

    const groups: Array<{
      id: string;
      dateKey: string;
      dateHeader: string;
      actionType: string;
      entries: TimelineEntry[];
    }> = [];

    let currentGroup: (typeof groups)[0] | null = null;

    timelineEntries.forEach((entry, index) => {
      const actionType = entry.log.action_type || "other";
      const prevEntry = index > 0 ? timelineEntries[index - 1] : null;
      const isSimilar = prevEntry && prevEntry.log.action_type === actionType && prevEntry.dateKey === entry.dateKey;

      if (isSimilar && currentGroup && currentGroup.actionType === actionType) {
        currentGroup.entries.push(entry);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `group-${index}`,
          dateKey: entry.dateKey,
          dateHeader: entry.dateHeader,
          actionType,
          entries: [entry],
        };
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [timelineEntries]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No history available for this event.</p>
        </CardContent>
      </Card>
    );
  }

  let lastDateKey = "";

  const isCollapsed = collapsible && !historyExpanded;
  const showLessButton = collapsible && historyExpanded;

  return (
    <Card ref={containerRef}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Event History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden" style={isCollapsed ? { maxHeight: COLLAPSED_MAX_HEIGHT } : undefined}>
          <div ref={contentRef} className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[60px] top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline entries */}
            <div className="space-y-0">
              {groupedEntries.map((group) => {
                const showDateSeparator = group.dateKey !== lastDateKey;
                lastDateKey = group.dateKey;

                const actionType = group.actionType;
                const icon = actionIcons[actionType] || <FileText className="h-4 w-4" />;
                const color = actionColors[actionType] || "bg-gray-500";
                const label = actionLabels[actionType] || actionType;

                const shouldShowExpand = group.entries.length > 1;
                const isExpanded = expandedGroups.has(group.id);
                const displayEntries = shouldShowExpand && !isExpanded ? [group.entries[0]] : group.entries;
                const hiddenCount = shouldShowExpand && !isExpanded ? group.entries.length - 1 : 0;

                return (
                  <div key={group.id}>
                    {/* Date separator */}
                    {showDateSeparator && (
                      <div className="relative flex items-center py-4">
                        <div className="absolute left-[60px] right-0 h-px bg-border" />
                        <div className="relative z-10 bg-background px-2 text-xs font-medium text-muted-foreground">
                          {group.dateHeader}
                        </div>
                      </div>
                    )}

                    {/* Timeline entries for this group */}
                    {displayEntries.map((entry) => {
                      const log = entry.log;

                      return (
                        <div key={log.id} className="relative flex gap-4 pb-6">
                          {/* Timestamp on left (local device time) */}
                          <div className="w-[60px] flex-shrink-0 pt-1">
                            <div
                              className="text-xs text-muted-foreground font-mono"
                              title={new Date(log.created_at).toLocaleString()}
                            >
                              {format(new Date(log.created_at), "h:mm a")}
                            </div>
                            <div className="text-[10px] text-muted-foreground/80">
                              {format(new Date(log.created_at), "MMM d")}
                            </div>
                          </div>

                          {/* Icon on timeline */}
                          <div className="relative z-10 flex-shrink-0">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-white shadow-sm`}
                            >
                              {icon}
                            </div>
                          </div>

                          {/* Content on right */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Action label and user */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{label}</span>
                              {log.user ? (
                                <>
                                  <span className="text-sm text-muted-foreground">by</span>
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(log.user.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{log.user.name}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <User className="h-3.5 w-3.5" />
                                  <span>System</span>
                                </div>
                              )}
                            </div>

                            {/* Comment */}
                            {log.comment && <p className="text-sm text-muted-foreground mt-1">{log.comment}</p>}

                            {/* Metadata */}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {log.metadata.event_title != null && <p>Event: {String(log.metadata.event_title)}</p>}
                                {log.metadata.reason != null && <p>Reason: {String(log.metadata.reason)}</p>}
                                {log.metadata.approver_count != null && (
                                  <p>Approvers: {String(log.metadata.approver_count)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Expand similar entries button */}
                    {shouldShowExpand && (
                      <div className="relative flex items-center pb-4">
                        {/* Dashed connector line */}
                        <div className="absolute left-[60px] h-8 w-0.5 border-l border-dashed border-border" />
                        <div className="relative z-10 ml-[60px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-transparent dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => toggleGroup(group.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Collapse {hiddenCount} similar {hiddenCount === 1 ? "entry" : "entries"}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Expand {hiddenCount} similar {hiddenCount === 1 ? "entry" : "entries"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gradient overlay and Show more when collapsible, collapsed, and content overflows */}
          {collapsible && isCollapsed && hasOverflow && (
            <div
              className="z-10 absolute bottom-0 left-0 right-0 flex flex-col items-center pt-16 pb-2 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none"
              aria-hidden
            >
              <div className="pointer-events-auto">
                <Button size="sm" className="shadow-md" onClick={() => setHistoryExpanded(true)}>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show more
                </Button>
              </div>
            </div>
          )}

          {/* Show less when expanded and collapsible */}
          {showLessButton && (
            <div className="pt-4 flex justify-center border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryExpanded(false)}
                className="text-muted-foreground"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
