"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriceInput } from "@/components/ui/price-input";
import { FileUploader } from "@/components/ui/file-uploader";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSubmitMarketingReport, useUpdateEventMarketingAssets } from "@/lib/hooks/use-marketing-reports";
import * as eventsClientService from "@/lib/services/client/events.client.service";
import { toast } from "sonner";
import type { EventMarketingFile } from "@/lib/types/database.types";
import type { MarketingReportWithSubmitter } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|m4v)$/i;

function getPreviewType(url: string, name?: string): "image" | "video" | "file" {
  const n = (name || url).toLowerCase();
  if (IMAGE_EXT.test(n)) return "image";
  if (VIDEO_EXT.test(n)) return "video";
  return "file";
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

interface AddMarketingReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  /** Current event marketing data (flyers, videos, budget) for initial values */
  event?: {
    marketing_flyers?: EventMarketingFile[] | null;
    marketing_videos?: EventMarketingFile[] | null;
    marketing_budget?: number | null;
  };
  /** When set, dialog is in view-only mode (report details + event assets, no edit) */
  viewReport?: MarketingReportWithSubmitter | null;
  onSuccess?: () => void;
}

export function AddMarketingReportDialog({
  open,
  onOpenChange,
  eventId,
  event,
  viewReport,
  onSuccess,
}: AddMarketingReportDialogProps) {
  const isViewMode = !!viewReport;
  const [notes, setNotes] = useState("");
  const [flyers, setFlyers] = useState<MarketingFileItem[]>([]);
  const [videos, setVideos] = useState<MarketingFileItem[]>([]);
  const [budgetValue, setBudgetValue] = useState<number | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    name?: string;
    type: "image" | "video" | "file";
    mimeType?: string;
  } | null>(null);

  const submitMutation = useSubmitMarketingReport();
  const updateAssetsMutation = useUpdateEventMarketingAssets();

  // Sync from event when dialog opens; in view mode also sync notes from viewReport
  useEffect(() => {
    if (open && event) {
      setFlyers(Array.isArray(event.marketing_flyers) ? [...event.marketing_flyers] : []);
      setVideos(Array.isArray(event.marketing_videos) ? [...event.marketing_videos] : []);
      setBudgetValue(event.marketing_budget ?? null);
    }
    if (open && viewReport) {
      setNotes(viewReport.notes ?? "");
    }
    if (!open) {
      setNotes("");
    }
  }, [open, event, viewReport]);

  const normalizeForPayload = useCallback(
    (items: MarketingFileItem[]): EventMarketingFile[] =>
      items.map((item) => (typeof item === "string" ? { url: item } : item)),
    []
  );

  const uploadFiles = useCallback(
    async (files: File[], type: "flyer" | "video") => {
      const setBusy = type === "flyer" ? setUploadingFlyer : setUploadingVideo;
      const current = type === "flyer" ? flyers : videos;
      setBusy(true);
      try {
        const added: { url: string; name: string }[] = [];
        for (const file of files) {
          const result = await eventsClientService.uploadEventMarketingAsset(eventId, file, type);
          added.push({ url: result.url, name: result.name });
        }
        const next: MarketingFileItem[] = [...current, ...added];
        // const payloadKey = type === "flyer" ? "marketing_flyers" : "marketing_videos";
        const payloadValue = normalizeForPayload(next);
        if (type === "flyer") {
          setFlyers(next);
          await updateAssetsMutation.mutateAsync({
            eventId,
            payload: { marketing_flyers: payloadValue },
          });
        } else {
          setVideos(next);
          await updateAssetsMutation.mutateAsync({
            eventId,
            payload: { marketing_videos: payloadValue },
          });
        }
      } catch (e) {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        setBusy(false);
      }
    },
    [eventId, flyers, videos, updateAssetsMutation, normalizeForPayload]
  );

  const removeFile = useCallback(
    async (type: "flyer" | "video", index: number) => {
      const current = type === "flyer" ? flyers : videos;
      const next = current.filter((_, i) => i !== index);
      if (type === "flyer") {
        setFlyers(next);
        await updateAssetsMutation.mutateAsync({
          eventId,
          payload: { marketing_flyers: normalizeForPayload(next) },
        });
      } else {
        setVideos(next);
        await updateAssetsMutation.mutateAsync({
          eventId,
          payload: { marketing_videos: normalizeForPayload(next) },
        });
      }
    },
    [eventId, flyers, videos, updateAssetsMutation, normalizeForPayload]
  );

  const handleSubmit = async () => {
    try {
      if (budgetValue !== null && (Number.isNaN(budgetValue) || budgetValue < 0)) {
        toast.error("Please enter a valid budget (number ≥ 0)");
        return;
      }
      await updateAssetsMutation.mutateAsync({
        eventId,
        payload: {
          marketing_flyers: normalizeForPayload(flyers),
          marketing_videos: normalizeForPayload(videos),
          marketing_budget: budgetValue,
        },
      });
      await submitMutation.mutateAsync({ eventId, notes: notes.trim() || null });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by mutations
    }
  };

  const isPending = submitMutation.isPending || updateAssetsMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{isViewMode ? "Marketing report" : "Add Marketing Report"}</DialogTitle>
            {isViewMode && viewReport ? (
              <div className="space-y-2 pt-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={`${statusColors[viewReport.status]} text-white border-0`}>
                    {statusLabels[viewReport.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">User</span>
                  <span>{viewReport.submitted_by_name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{format(new Date(viewReport.created_at), "PPp")}</span>
                </div>
              </div>
            ) : (
              <DialogDescription>
                Submit a marketing report for this event. Include flyers, videos, and budget. The Global Director will
                review and approve or reject it. If rejected, you can submit another report.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="marketing-notes">Notes {isViewMode ? "" : "(optional)"}</Label>
              {isViewMode ? (
                <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-[80px]">
                  {notes || "—"}
                </p>
              ) : (
                <Textarea
                  id="marketing-notes"
                  placeholder="Add any notes for this marketing report..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            {/* Flyers */}
            <div className="space-y-2">
              <Label>Flyers</Label>
              {!isViewMode && (
                <p className="text-xs text-muted-foreground">
                  Any format (images, videos, PDFs, etc.). Click a file to preview.
                </p>
              )}
              {!isViewMode && (
                <FileUploader
                  accept="*/*"
                  multiple
                  maxFiles={20}
                  currentCount={flyers.length}
                  onFilesSelected={(files) => uploadFiles(files, "flyer")}
                  disabled={uploadingFlyer}
                  uploadProgress={uploadingFlyer ? 50 : undefined}
                  acceptLabel="Any format"
                >
                  {uploadingFlyer && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-sm">Uploading...</span>
                    </>
                  )}
                </FileUploader>
              )}
              {flyers.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {flyers.map((item, index) => {
                      const url = getItemUrl(item);
                      const name = getItemName(item, index, "Flyer");
                      const type = getPreviewType(url, name);

                      if (!url) return null;

                      const commonClick = () => {
                        setPreview({
                          url,
                          name,
                          type,
                          mimeType: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined,
                        });
                      };

                      if (type === "image") {
                        return (
                          <div
                            key={`${url}-${index}`}
                            className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                          >
                            <button
                              type="button"
                              className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                              onClick={commonClick}
                            >
                              <Image src={url} alt={name} fill className="object-cover" unoptimized sizes="120px" />
                            </button>
                            {!isViewMode && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFile("flyer", index)}
                                disabled={isPending}
                                aria-label="Remove flyer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      }

                      if (type === "video") {
                        return (
                          <div
                            key={`${url}-${index}`}
                            className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
                          >
                            <button
                              type="button"
                              className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                              onClick={commonClick}
                            >
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            </button>
                            {!isViewMode && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFile("flyer", index)}
                                disabled={isPending}
                                aria-label="Remove flyer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={`${url}-${index}`} className="flex items-center gap-1 col-span-3 sm:col-span-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="truncate max-w-full justify-start"
                            onClick={commonClick}
                          >
                            {name}
                          </Button>
                          {!isViewMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFile("flyer", index)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Videos */}
            <div className="space-y-2">
              <Label>Videos</Label>
              {!isViewMode && <p className="text-xs text-muted-foreground">Video files only. Click to preview.</p>}
              {!isViewMode && (
                <FileUploader
                  accept={VIDEO_ACCEPT}
                  multiple
                  maxFiles={20}
                  currentCount={videos.length}
                  onFilesSelected={(files) => uploadFiles(files, "video")}
                  disabled={uploadingVideo}
                  uploadProgress={uploadingVideo ? 50 : undefined}
                  acceptLabel="Video files"
                >
                  {uploadingVideo && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-sm">Uploading...</span>
                    </>
                  )}
                </FileUploader>
              )}
              {videos.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {videos.map((item, index) => {
                      const url = getItemUrl(item);
                      const name = getItemName(item, index, "Video");
                      if (!url) return null;

                      return (
                        <div
                          key={`${url}-${index}`}
                          className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
                        >
                          <button
                            type="button"
                            className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                            onClick={() =>
                              setPreview({
                                url,
                                name,
                                type: "video",
                              })
                            }
                          >
                            <video
                              src={url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          </button>
                          {!isViewMode && (
                            <button
                              type="button"
                              className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile("video", index)}
                              disabled={isPending}
                              aria-label="Remove video"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="marketing-budget-dialog">Budget (price)</Label>
              {isViewMode ? (
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {budgetValue != null
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(budgetValue)
                    : "—"}
                </p>
              ) : (
                <PriceInput
                  id="marketing-budget-dialog"
                  value={budgetValue ?? undefined}
                  onChange={(v) => setBudgetValue(v ?? null)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            {isViewMode ? (
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
