/**
 * Report Form Component
 *
 * Form for submitting post-event reports
 * Only visible when event status is completed_awaiting_report and user is event creator
 */

"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Loader2, AlertCircle, CheckCircle2, ExternalLink, Plus, Trash2, FileText } from "lucide-react";
import { useSubmitReport, useUpdateReport } from "@/lib/hooks/use-reports";
import { z } from "zod";
import { toast } from "sonner";
import type { Report } from "@/lib/types/database.types";
import type { EventWithRelations } from "@/lib/data-access/events.dal";

const reportSchema = z.object({
  attendance_count: z.number().int().nonnegative("Attendance count must be 0 or greater"),
  summary: z
    .string()
    .min(20, "Summary must be at least 20 characters")
    .max(1000, "Summary must be less than 1000 characters"),
  feedback: z.string().max(2000, "Feedback must be less than 2000 characters").optional().nullable(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportFormProps {
  eventId: string;
  event: EventWithRelations;
  existingReport?: Report | null;
  onSuccess?: () => void;
}

export function ReportForm({ eventId, event, existingReport, onSuccess }: ReportFormProps) {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [externalLinks, setExternalLinks] = useState<Array<{ url: string; title: string }>>(
    existingReport?.external_links || []
  );
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitReport = useSubmitReport();
  const updateReport = useUpdateReport();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      attendance_count: existingReport?.attendance_count || 0,
      summary: existingReport?.summary || "",
      feedback: existingReport?.feedback || "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"];
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} has an invalid type. Only images and videos are allowed.`);
        return false;
      }
      return true;
    });
    setMediaFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addExternalLink = () => {
    if (!newLinkUrl || !newLinkTitle) {
      toast.error("Please provide both URL and title for the link");
      return;
    }

    try {
      new URL(newLinkUrl); // Validate URL
    } catch {
      toast.error("Please provide a valid URL");
      return;
    }

    setExternalLinks((prev) => [...prev, { url: newLinkUrl, title: newLinkTitle }]);
    setNewLinkUrl("");
    setNewLinkTitle("");
  };

  const removeExternalLink = (index: number) => {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReportFormData) => {
    try {
      if (existingReport && existingReport.status === "rejected") {
        // Update existing rejected report
        await updateReport.mutateAsync({
          reportId: existingReport.id,
          eventId,
          data: {
            attendance_count: data.attendance_count,
            summary: data.summary,
            feedback: data.feedback || null,
            external_links: externalLinks.length > 0 ? externalLinks : null,
            mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
          },
        });
      } else {
        // Submit new report
        await submitReport.mutateAsync({
          eventId,
          data: {
            attendance_count: data.attendance_count,
            summary: data.summary,
            feedback: data.feedback || null,
            external_links: externalLinks.length > 0 ? externalLinks : null,
            mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
          },
        });
      }

      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isSubmitting = submitReport.isPending || updateReport.isPending;
  const isResubmission = existingReport?.status === "rejected";

  return (
    <div className="space-y-6">
      {isResubmission && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Your previous report was rejected. Please review the feedback and resubmit with corrections.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Attendance Count */}
        <div className="space-y-3">
          <Label htmlFor="attendance_count" className="text-base font-semibold">
            Actual Attendance <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                id="attendance_count"
                type="number"
                min="0"
                {...form.register("attendance_count", { valueAsNumber: true })}
                className={`text-lg h-12 ${form.formState.errors.attendance_count ? "border-destructive" : ""}`}
                placeholder="Enter actual attendance count"
              />
              {form.formState.errors.attendance_count && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.attendance_count.message}
                </p>
              )}
            </div>
            {event.expected_attendance && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Expected:</div>
                <div className="font-semibold">{event.expected_attendance.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground ml-auto">Actual:</div>
                <div className="font-semibold">{form.watch("attendance_count") || 0}</div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <Label htmlFor="summary" className="text-base font-semibold">
            Event Summary <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="summary"
            rows={8}
            placeholder="Provide a detailed summary of the event. Describe what happened, key highlights, and overall outcomes..."
            {...form.register("summary")}
            className={`resize-none text-base ${form.formState.errors.summary ? "border-destructive" : ""}`}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            {form.formState.errors.summary ? (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.summary.message}
              </p>
            ) : (
              <div />
            )}
            <p className="text-sm text-muted-foreground">
              {form.watch("summary")?.length || 0} / 1000 characters (minimum 20)
            </p>
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-3">
          <Label htmlFor="feedback" className="text-base font-semibold">
            Feedback <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="feedback"
            rows={6}
            placeholder="What went well? What could be improved? Share any additional insights or recommendations..."
            {...form.register("feedback")}
            className="resize-none text-base"
            maxLength={2000}
          />
          <p className="text-sm text-muted-foreground text-right">
            {form.watch("feedback")?.length || 0} / 2000 characters
          </p>
        </div>

        {/* Media Upload */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Media Files <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mb-3"
              size="lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Files
            </Button>
            <p className="text-sm text-muted-foreground">Accepted: Images (JPG, PNG, GIF) and Videos (MP4, MOV)</p>
            <p className="text-xs text-muted-foreground mt-1">Maximum 50MB per file</p>
          </div>

          {/* File List */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              {mediaFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Existing Media from Report */}
          {existingReport?.media_urls && existingReport.media_urls.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Previously uploaded media:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {existingReport.media_urls.map((url, index) => (
                  <div key={index} className="relative aspect-video bg-muted rounded overflow-hidden">
                    {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Video</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* External Links */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            External Links <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                placeholder="https://example.com"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                type="url"
                className="flex-1"
              />
              <Input
                placeholder="Link Title"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addExternalLink} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {externalLinks.length > 0 && (
              <div className="space-y-2 mt-2">
                {externalLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ExternalLink className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExternalLink(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background pb-4 -mb-4">
          <Button type="button" variant="outline" onClick={() => onSuccess?.()} disabled={isSubmitting} size="lg">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[140px]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isResubmission ? "Resubmitting..." : "Submitting..."}
              </>
            ) : (
              <>{isResubmission ? "Resubmit Report" : "Submit Report"}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
