"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import type { MarketingReportWithSubmitter, EventMarketingFile } from "@/lib/types/database.types";
import { useMarketingReports } from "@/lib/hooks/use-marketing-reports";
import { useProfile } from "@/lib/hooks/use-profile";
import { UserRole } from "@/lib/types/roles";
import { AddMarketingReportDialog } from "./AddMarketingReportDialog";
import { EventDetailVenueCard } from "./EventDetailVenueCard";
import { EventDetailDJCard } from "./EventDetailDJCard";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

type MarketingFileItem = EventMarketingFile | string;

function getItemUrl(item: MarketingFileItem): string {
  return typeof item === "string" ? item : item.url;
}

function getItemName(item: MarketingFileItem, index: number, fallbackPrefix: string = "File"): string {
  if (typeof item === "string") {
    const fromPath = item.split("/").pop();
    return fromPath || `${fallbackPrefix} ${index + 1}`;
  }
  if (item.name && item.name.trim()) return item.name;
  const fromPath = item.url.split("/").pop();
  return fromPath || `${fallbackPrefix} ${index + 1}`;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|m4v)$/i;

function getPreviewType(url: string, name?: string): "image" | "video" | "file" {
  const n = (name || url).toLowerCase();
  if (IMAGE_EXT.test(n)) return "image";
  if (VIDEO_EXT.test(n)) return "video";
  return "file";
}

interface MarketingTabProps {
  eventId: string;
  event: EventWithRelations;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function MarketingTab({ eventId, event }: MarketingTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewReport, setViewReport] = useState<MarketingReportWithSubmitter | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    name?: string;
    type: "image" | "video" | "file";
    mimeType?: string;
  } | null>(null);

  const { data: profile } = useProfile();
  const { data: reports = [], isLoading } = useMarketingReports(eventId);

  const isMarketingManager = profile?.role === UserRole.MARKETING_MANAGER;
  const approvedReport = reports.find((r) => r.status === "approved");
  const pendingReport = reports.find((r) => r.status === "pending");
  const canAddReport = isMarketingManager && !approvedReport && !pendingReport;

  // Most recent report (for "last report" section when any report exists)
  const lastReport =
    reports.length > 0
      ? [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;

  return (
    <div className="space-y-6">
      {/* When there is at least one report: left = last report summary (col-span-2), right = Venue + DJ */}
      {lastReport && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Last report</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`${statusColors[lastReport.status]} text-white border-0`}>
                      {statusLabels[lastReport.status]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {lastReport.submitted_by_name ?? "—"} · {format(new Date(lastReport.created_at), "PPp")}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Flyers - from this report */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Flyers</Label>
                  {(lastReport.marketing_flyers?.length ?? 0) > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(lastReport.marketing_flyers ?? []).map((item, index) => {
                        const url = getItemUrl(item);
                        const name = getItemName(item, index, "Flyer");
                        const type = getPreviewType(url, name);
                        if (!url) return null;
                        const openPreview = () =>
                          setPreview({
                            url,
                            name,
                            type,
                            mimeType: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined,
                          });
                        if (type === "image") {
                          return (
                            <div
                              key={`${url}-${index}`}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                              <button
                                type="button"
                                className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                                onClick={openPreview}
                              >
                                <Image src={url} alt={name} fill className="object-cover" unoptimized sizes="120px" />
                              </button>
                            </div>
                          );
                        }
                        if (type === "video") {
                          return (
                            <button
                              key={`${url}-${index}`}
                              type="button"
                              className="relative aspect-video rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary block w-full"
                              onClick={openPreview}
                            >
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            </button>
                          );
                        }
                        return (
                          <Button
                            key={`${url}-${index}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="col-span-3 sm:col-span-4 truncate max-w-full justify-start"
                            onClick={openPreview}
                          >
                            {name}
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* Videos - from this report */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Videos</Label>
                  {(lastReport.marketing_videos?.length ?? 0) > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(lastReport.marketing_videos ?? []).map((item, index) => {
                        const url = getItemUrl(item);
                        const name = getItemName(item, index, "Video");
                        if (!url) return null;
                        return (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            className="relative aspect-video rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={() => setPreview({ url, name, type: "video" })}
                          >
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* Marketing strategy PDF - from this report */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Marketing strategy PDF</Label>
                  {(lastReport.marketing_strategy_files?.length ?? 0) > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(lastReport.marketing_strategy_files ?? []).map((item, index) => {
                        const url = getItemUrl(item);
                        const name = getItemName(item, index, "File");
                        const type = getPreviewType(url, name);
                        if (!url) return null;
                        const openPreview = () =>
                          setPreview({
                            url,
                            name,
                            type,
                            mimeType: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined,
                          });
                        if (type === "image") {
                          return (
                            <div
                              key={`${url}-${index}`}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                              <button
                                type="button"
                                className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                                onClick={openPreview}
                              >
                                <Image src={url} alt={name} fill className="object-cover" unoptimized sizes="120px" />
                              </button>
                            </div>
                          );
                        }
                        if (type === "video") {
                          return (
                            <button
                              key={`${url}-${index}`}
                              type="button"
                              className="relative aspect-video rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary block w-full"
                              onClick={openPreview}
                            >
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            </button>
                          );
                        }
                        return (
                          <Button
                            key={`${url}-${index}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="col-span-3 sm:col-span-4 truncate max-w-full justify-start"
                            onClick={openPreview}
                          >
                            {name}
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* Budget - from this report */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Budget (price)</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {lastReport.marketing_budget != null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                          Number(lastReport.marketing_budget)
                        )
                      : "—"}
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-[60px]">
                    {lastReport.notes || "—"}
                  </p>
                </div>

                {/* Budget - from this report */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Budget (price)</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {lastReport.marketing_budget != null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                          Number(lastReport.marketing_budget)
                        )
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {event.venue && <EventDetailVenueCard venue={event.venue} />}
            {event.dj && <EventDetailDJCard dj={event.dj} />}
          </div>
        </div>
      )}

      {preview && (
        <MediaPreviewDialog
          open={!!preview}
          onOpenChange={(open) => !open && setPreview(null)}
          type={preview.type}
          url={preview.url}
          downloadName={preview.name}
          mimeType={preview.mimeType}
        />
      )}

      {/* Single Marketing card: Reports + Marketing Assets (report form marketing) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Marketing Reports</CardTitle>
            {/* {canAddReport && ( */}
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Report
            </Button>
            {/* )} */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Marketing Reports */}
          <div>
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">View more</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : reports.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No marketing reports yet.</p>
                {canAddReport && (
                  <Button onClick={() => setShowAddDialog(true)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Report
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">View more</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant="outline" className={`${statusColors[report.status]} text-white border-0`}>
                          {statusLabels[report.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{report.submitted_by_name ?? "—"}</TableCell>
                      <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{report.notes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setViewReport(report)} className="gap-1">
                          <Eye className="h-4 w-4" />
                          View more
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <AddMarketingReportDialog
        open={showAddDialog || !!viewReport}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setViewReport(null);
          }
        }}
        eventId={eventId}
        event={{
          marketing_flyers: lastReport?.marketing_flyers ?? event.marketing_flyers ?? null,
          marketing_videos: lastReport?.marketing_videos ?? event.marketing_videos ?? null,
          marketing_strategy_files: lastReport?.marketing_strategy_files ?? null,
          marketing_budget: lastReport?.marketing_budget ?? event.marketing_budget ?? null,
        }}
        viewReport={viewReport}
      />
    </div>
  );
}
