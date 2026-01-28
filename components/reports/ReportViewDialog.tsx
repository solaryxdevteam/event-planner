/**
 * Report View Dialog Component
 *
 * Shows full report details in a dialog
 */

"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Calendar, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Report } from "@/lib/types/database.types";

interface ReportViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report;
  eventTitle: string;
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

export function ReportViewDialog({ open, onOpenChange, report, eventTitle }: ReportViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
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

          {/* Attendance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Attendance</h3>
            </div>
            <p className="text-2xl font-bold">{report.attendance_count.toLocaleString()}</p>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Event Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.summary}</p>
          </div>

          {/* Feedback */}
          {report.feedback && (
            <div className="space-y-2">
              <h3 className="font-semibold">Feedback</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.feedback}</p>
            </div>
          )}

          {/* Media Files */}
          {report.media_urls && report.media_urls.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Media Files</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {report.media_urls.map((url, index) => {
                  const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i);
                  const fileName = url.split("/").pop() || `media-${index + 1}`;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="relative aspect-video bg-muted rounded overflow-hidden border">
                        {isImage ? (
                          <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Video</span>
                          </div>
                        )}
                      </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
