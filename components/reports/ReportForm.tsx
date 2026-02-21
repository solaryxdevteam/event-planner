/**
 * Report Form Component
 *
 * Form for submitting post-event reports.
 * Fields: total attendance, ticket/bar/table sales, reels (min 3), photos (min 10),
 * detailed report, optional incidents.
 */

"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Link2, Plus, Trash2 } from "lucide-react";
import { useSubmitReport } from "@/lib/hooks/use-reports";
import { z } from "zod";
import { toast } from "sonner";
import type { EventWithRelations } from "@/lib/data-access/events.dal";
import { FileUploader } from "@/components/ui/file-uploader";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";
import * as reportsClientService from "@/lib/services/client/reports.client.service";
import Image from "next/image";

const reportSchema = z.object({
  attendance_count: z
    .number()
    .int("Must be a whole number")
    .nonnegative("Total number of attendance must be 0 or greater"),
  total_ticket_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  total_bar_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  total_table_sales: z.number().nonnegative("Must be 0 or greater").optional().nullable(),
  detailed_report: z
    .string()
    .min(20, "Detailed event report must be at least 20 characters")
    .max(10000, "Must be less than 10000 characters"),
  incidents: z.string().max(2000, "Must be less than 2000 characters").optional().nullable(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportFormProps {
  eventId: string;
  event: EventWithRelations;
  onSuccess?: () => void;
}

function getMediaType(file: File): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

type ReelItem = { url: string; type: "image" | "video" };
type PhotoItem = { url: string };
type ExternalLinkItem = { url: string; title: string };

export function ReportForm({ eventId, event, onSuccess }: ReportFormProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);
  const [uploadingReels, setUploadingReels] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);

  const submitReport = useSubmitReport();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      attendance_count: 0,
      total_ticket_sales: null,
      total_bar_sales: null,
      total_table_sales: null,
      detailed_report: "",
      incidents: null,
    },
  });

  const handleReelsSelected = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploadingReels(true);
      try {
        const toAdd: ReelItem[] = [];
        for (const file of files) {
          const { url } = await reportsClientService.uploadReportMedia(eventId, file, "reel");
          toAdd.push({ url, type: getMediaType(file) });
        }
        setReels((prev) => [...prev, ...toAdd].slice(0, 20));
      } catch (e) {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Could not upload reels" });
      } finally {
        setUploadingReels(false);
      }
    },
    [eventId]
  );

  const handlePhotosSelected = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploadingPhotos(true);
      try {
        const toAdd: PhotoItem[] = [];
        for (const file of files) {
          const { url } = await reportsClientService.uploadReportMedia(eventId, file, "photo");
          toAdd.push({ url });
        }
        setPhotos((prev) => [...prev, ...toAdd].slice(0, 30));
      } catch (e) {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Could not upload photos" });
      } finally {
        setUploadingPhotos(false);
      }
    },
    [eventId]
  );

  const removeReel = (index: number) => {
    setReels((prev) => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const addExternalLink = () => {
    setExternalLinks((prev) => [...prev, { url: "", title: "" }]);
  };

  const removeExternalLink = (index: number) => {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExternalLink = (index: number, field: "url" | "title", value: string) => {
    setExternalLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  };

  const onSubmit = async (data: ReportFormData) => {
    if (reels.length < 3) {
      toast.error("Reels: minimum 3 files required");
      return;
    }
    if (photos.length < 10) {
      toast.error("Upload photos: minimum 10 files required");
      return;
    }

    // Validate external links: if any row has content, both title and URL must be valid
    const linkRegex = /^https?:\/\/.+/i;
    const hasPartialLink = externalLinks.some((l) => l.title.trim() || l.url.trim());
    const invalidLinks = externalLinks.filter(
      (l) => l.title.trim() && (!l.url.trim() || !linkRegex.test(l.url.trim()))
    );
    if (hasPartialLink && invalidLinks.length > 0) {
      toast.error("External links: each link must have a title and a valid URL (e.g. https://...)");
      return;
    }
    const validLinks = externalLinks.filter((l) => l.title.trim() && l.url.trim() && linkRegex.test(l.url.trim()));

    try {
      await submitReport.mutateAsync({
        eventId,
        data: {
          attendance_count: data.attendance_count,
          total_ticket_sales: data.total_ticket_sales ?? null,
          total_bar_sales: data.total_bar_sales ?? null,
          total_table_sales: data.total_table_sales ?? null,
          detailed_report: data.detailed_report,
          incidents: data.incidents ?? null,
          external_links: validLinks.length > 0 ? validLinks : null,
          reelsUrls: reels.map((r) => r.url),
          mediaUrls: photos.map((p) => p.url),
        },
      });
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = submitReport.isPending;

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Total number of attendance */}
        <div className="space-y-3">
          <Label htmlFor="attendance_count" className="text-base font-semibold">
            Total number of attendance <span className="text-destructive">*</span>
          </Label>
          <Input
            id="attendance_count"
            type="number"
            min={0}
            {...form.register("attendance_count", { valueAsNumber: true })}
            className={`text-lg h-12 max-w-full ${form.formState.errors.attendance_count ? "border-destructive" : ""}`}
            placeholder="0"
          />
          {form.formState.errors.attendance_count && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {form.formState.errors.attendance_count.message}
            </p>
          )}
          {event.expected_attendance != null && (
            <p className="text-sm text-muted-foreground">
              Expected attendance for this event: {event.expected_attendance.toLocaleString()}
            </p>
          )}
        </div>

        {/* Sales: ticket, bar, table */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Sales</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_ticket_sales" className="text-sm font-normal">
                Total ticket sales
              </Label>
              <Input
                id="total_ticket_sales"
                type="number"
                min={0}
                step={0.01}
                {...form.register("total_ticket_sales", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : v),
                })}
                className={form.formState.errors.total_ticket_sales ? "border-destructive" : ""}
                placeholder="0.00"
              />
              {form.formState.errors.total_ticket_sales && (
                <p className="text-xs text-destructive">{form.formState.errors.total_ticket_sales.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_bar_sales" className="text-sm font-normal">
                Total bar sales
              </Label>
              <Input
                id="total_bar_sales"
                type="number"
                min={0}
                step={0.01}
                {...form.register("total_bar_sales", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : v),
                })}
                className={form.formState.errors.total_bar_sales ? "border-destructive" : ""}
                placeholder="0.00"
              />
              {form.formState.errors.total_bar_sales && (
                <p className="text-xs text-destructive">{form.formState.errors.total_bar_sales.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_table_sales" className="text-sm font-normal">
                Total table sales
              </Label>
              <Input
                id="total_table_sales"
                type="number"
                min={0}
                step={0.01}
                {...form.register("total_table_sales", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : v),
                })}
                className={form.formState.errors.total_table_sales ? "border-destructive" : ""}
                placeholder="0.00"
              />
              {form.formState.errors.total_table_sales && (
                <p className="text-xs text-destructive">{form.formState.errors.total_table_sales.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reels – min 3 files */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Reels <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">Minimum 3 files required.</p>
          <FileUploader
            accept="image/*,video/*"
            maxFiles={20}
            maxSizeBytes={50 * 1024 * 1024}
            currentCount={reels.length}
            onFilesSelected={handleReelsSelected}
            acceptLabel="Images or videos"
            disabled={uploadingReels}
            uploadProgress={uploadingReels ? 50 : undefined}
          />
          {reels.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {reels.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative rounded-lg overflow-hidden bg-muted group aspect-square"
                >
                  <button
                    type="button"
                    className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                    onClick={() => setPreview({ url: item.url, type: item.type, name: `reel-${index + 1}` })}
                  >
                    {item.type === "image" ? (
                      <Image
                        src={item.url}
                        alt={`Reel ${index + 1}`}
                        className="w-full h-full object-cover"
                        width={100}
                        height={100}
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReel(index);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          {reels.length > 0 && reels.length < 3 && (
            <p className="text-sm text-amber-600">Add at least {3 - reels.length} more file(s) (minimum 3 total).</p>
          )}
        </div>

        {/* Upload photos – min 10 */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Upload photos <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">Minimum 10 photos required.</p>
          <FileUploader
            accept="image/*"
            maxFiles={30}
            maxSizeBytes={50 * 1024 * 1024}
            currentCount={photos.length}
            onFilesSelected={handlePhotosSelected}
            acceptLabel="Images (JPG, PNG, GIF, etc.)"
            disabled={uploadingPhotos}
            uploadProgress={uploadingPhotos ? 50 : undefined}
          />
          {photos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative rounded-lg overflow-hidden bg-muted group aspect-square"
                >
                  <button
                    type="button"
                    className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                    onClick={() => setPreview({ url: item.url, type: "image", name: `photo-${index + 1}` })}
                  >
                    <Image
                      src={item.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      width={100}
                      height={100}
                    />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          {photos.length > 0 && photos.length < 10 && (
            <p className="text-sm text-amber-600">
              Add at least {10 - photos.length} more photo(s) (minimum 10 total).
            </p>
          )}
        </div>

        {/* Detailed event report */}
        <div className="space-y-3">
          <Label htmlFor="detailed_report" className="text-base font-semibold">
            Detailed event report <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="detailed_report"
            rows={10}
            placeholder="Provide a detailed report of the event (at least 20 characters)..."
            {...form.register("detailed_report")}
            className={`resize-none text-base ${form.formState.errors.detailed_report ? "border-destructive" : ""}`}
            maxLength={10000}
          />
          <div className="flex justify-between text-sm">
            {form.formState.errors.detailed_report ? (
              <p className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.detailed_report.message}
              </p>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground">{form.watch("detailed_report")?.length || 0} / 10000 (min 20)</span>
          </div>
        </div>

        {/* Incidents – optional */}
        <div className="space-y-3">
          <Label htmlFor="incidents" className="text-base font-semibold">
            Incidents <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="incidents"
            rows={4}
            placeholder="Any incidents or issues during the event..."
            {...form.register("incidents")}
            className="resize-none text-base"
            maxLength={2000}
          />
          <p className="text-sm text-muted-foreground text-right">{form.watch("incidents")?.length || 0} / 2000</p>
        </div>

        {/* External links – optional */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              External links <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addExternalLink}>
              <Plus className="h-4 w-4 mr-1" />
              Add link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add links to external content (e.g. social posts, press, playlists).
          </p>
          {externalLinks.length > 0 && (
            <div className="space-y-3">
              {externalLinks.map((link, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border bg-muted/30">
                  <Input
                    placeholder="Link title"
                    value={link.title}
                    onChange={(e) => updateExternalLink(index, "title", e.target.value)}
                    className="flex-1 min-w-0"
                    maxLength={200}
                  />
                  <Input
                    placeholder="https://..."
                    type="url"
                    value={link.url}
                    onChange={(e) => updateExternalLink(index, "url", e.target.value)}
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExternalLink(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background pb-4 -mb-4">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()} disabled={isSubmitting} size="lg">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[140px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </form>

      {preview && (
        <MediaPreviewDialog
          open={!!preview}
          onOpenChange={(open) => !open && setPreview(null)}
          type={preview.type}
          url={preview.url}
          downloadName={preview.name}
        />
      )}
    </div>
  );
}
