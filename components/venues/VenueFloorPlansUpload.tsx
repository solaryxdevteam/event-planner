"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "@/components/ui/file-uploader";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";
import Image from "next/image";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MAX_FILES = 20;
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const UPLOAD_ENDPOINT = "/api/venues/upload-file";

export interface FloorPlanItem {
  url: string;
  name?: string;
}

interface VenueFloorPlansUploadProps {
  floorPlans: FloorPlanItem[];
  onFloorPlansChange: (items: FloorPlanItem[]) => void;
  error?: string;
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split("/").filter(Boolean).pop() ?? "";
    const name = segment.split("?")[0]?.trim() ?? "";
    return name.length > 0 ? decodeURIComponent(name) : "";
  } catch {
    return "";
  }
}

function uploadFile(file: File, onProgress: (p: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "floorplan");
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      onProgress(100);
      const isJson = (xhr.getResponseHeader("content-type") ?? "").includes("application/json");
      let body: { url?: string; error?: string };
      try {
        body = isJson ? JSON.parse(xhr.responseText || "{}") : {};
      } catch {
        reject(new Error("Invalid response"));
        return;
      }
      if (xhr.status === 200 && body.url) resolve({ url: body.url });
      else reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", UPLOAD_ENDPOINT);
    xhr.send(formData);
  });
}

export function VenueFloorPlansUpload({ floorPlans, onFloorPlansChange, error }: VenueFloorPlansUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  const processFiles = useCallback(
    async (fileList: File[]) => {
      const left = MAX_FILES - floorPlans.length;
      if (left <= 0) {
        toast.error(`Maximum ${MAX_FILES} floor plan files allowed`);
        return;
      }
      const toAdd: File[] = [];
      for (const file of fileList.slice(0, left)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: use PDF or image (JPEG, PNG, GIF, WebP)`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: max 20MB`);
          continue;
        }
        toAdd.push(file);
      }
      if (toAdd.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const results = await Promise.all(
          toAdd.map((file, i) => {
            return uploadFile(file, (percent) => {
              setUploadProgress((p) => (p + percent) / (i + 1));
            });
          })
        );
        setUploadProgress(100);
        onFloorPlansChange([
          ...floorPlans,
          ...results.map((r, i) => ({ url: r.url, name: toAdd[i]?.name ?? undefined })),
        ]);
        toast.success(`${results.length} file(s) uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [floorPlans, onFloorPlansChange]
  );

  const remove = (index: number) => {
    onFloorPlansChange(floorPlans.filter((_, i) => i !== index));
  };

  const openImagePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewType("image");
  };

  return (
    <div className="space-y-2">
      <FileUploader
        accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
        multiple
        maxFiles={MAX_FILES}
        maxSizeBytes={MAX_SIZE}
        onFilesSelected={processFiles}
        disabled={isUploading}
        acceptLabel="PDF or images"
        currentCount={floorPlans.length}
        uploadProgress={isUploading ? uploadProgress : undefined}
      />
      {floorPlans.length > 0 && (
        <ul className="space-y-2">
          {floorPlans.map((item, i) => {
            const url = item.url;
            const isImage = isImageUrl(url);
            const displayName =
              item.name?.trim() || fileNameFromUrl(url) || (isImage ? `Image ${i + 1}` : `Document ${i + 1}`);
            return (
              <li key={`${url}-${i}`} className="flex items-center gap-2 rounded-lg border overflow-hidden bg-muted/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isImage ? (
                    <button
                      type="button"
                      className="relative w-14 h-14 shrink-0 bg-muted"
                      onClick={() => openImagePreview(url)}
                    >
                      <Image src={url} alt="" className="w-full h-full object-cover" width={100} height={100} />
                    </button>
                  ) : (
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-muted">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 py-2">
                    <span className="text-sm truncate block" title={displayName}>
                      {displayName}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      Open file
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <MediaPreviewDialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
        type={previewType}
        url={previewUrl || ""}
      />
    </div>
  );
}
