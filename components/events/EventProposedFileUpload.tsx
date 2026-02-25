"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 20;
const UPLOAD_ENDPOINT = "/api/events/upload-proposed-file";

export interface ProposedFileItem {
  url: string;
  name?: string;
}

function uploadFile(file: File, onProgress: (p: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
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

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url.split("?")[0] ?? "");
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url.split("?")[0] ?? "");
}

interface EventProposedFileUploadProps {
  label: string;
  value: ProposedFileItem[];
  onChange: (files: ProposedFileItem[]) => void;
  error?: string;
}

export function EventProposedFileUpload({ label, value, onChange, error }: EventProposedFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: "image" | "video" | "file";
    name?: string;
  } | null>(null);

  const processFiles = useCallback(
    async (fileList: File[]) => {
      const left = MAX_FILES - value.length;
      if (left <= 0) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return;
      }
      const toAdd: File[] = [];
      for (const file of fileList.slice(0, left)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: use image, video, or PDF`);
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
        const newItems: ProposedFileItem[] = [];
        for (let i = 0; i < toAdd.length; i++) {
          const file = toAdd[i]!;
          const { url } = await uploadFile(file, (p) => {
            setUploadProgress((prev) => (prev + p) / (i + 1));
          });
          newItems.push({ url, name: file.name });
        }
        onChange([...value, ...newItems]);
        toast.success(`${newItems.length} file(s) uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [value, onChange]
  );

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label} <span className="text-destructive">*</span>
      </label>
      <FileUploader
        accept=".pdf,image/*,video/mp4,video/webm,video/quicktime"
        multiple
        maxFiles={MAX_FILES}
        maxSizeBytes={MAX_SIZE}
        onFilesSelected={processFiles}
        disabled={isUploading}
        acceptLabel="Image, video, or PDF"
        currentCount={value.length}
        uploadProgress={isUploading ? uploadProgress : undefined}
        className={error ? "border-destructive rounded-lg" : ""}
      />
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((item, i) => {
            const displayName = item.name?.trim() || fileNameFromUrl(item.url) || `File ${i + 1}`;
            const isImage = isImageUrl(item.url);
            const isVideo = isVideoUrl(item.url);
            return (
              <li
                key={`${item.url}-${i}`}
                className="flex items-center gap-2 rounded-lg border overflow-hidden bg-muted/50 p-2"
              >
                {isImage ? (
                  <button
                    type="button"
                    className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => setPreviewFile({ url: item.url, type: "image", name: displayName })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ) : isVideo ? (
                  <button
                    type="button"
                    className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary relative"
                    onClick={() => setPreviewFile({ url: item.url, type: "video", name: displayName })}
                  >
                    <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                  </button>
                ) : (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-muted rounded-md">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" title={displayName}>
                    {displayName}
                  </p>
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
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        type={previewFile?.type ?? "file"}
        url={previewFile?.url ?? ""}
        downloadName={previewFile?.name}
      />
    </div>
  );
}
