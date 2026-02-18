"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { FileUploader } from "@/components/ui/file-uploader";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";
import type { VenueMediaItem } from "@/lib/types/database.types";

const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_ITEMS = 10;
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const UPLOAD_ENDPOINT = "/api/venues/upload-file";

interface VenueMediaUploadProps {
  media: VenueMediaItem[];
  onMediaChange: (items: VenueMediaItem[]) => void;
  venueId?: string;
  error?: string;
}

function uploadFile(file: File, onProgress: (p: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "media");
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

export function VenueMediaUpload({ media, onMediaChange, venueId: _venueId, error }: VenueMediaUploadProps) {
  void _venueId;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  const processFiles = useCallback(
    async (fileList: File[]) => {
      const left = MAX_ITEMS - media.length;
      if (left <= 0) {
        toast.error(`Maximum ${MAX_ITEMS} photos/videos allowed`);
        return;
      }
      const toAdd: File[] = [];
      for (const file of fileList.slice(0, left)) {
        const isImage = ALLOWED_IMAGE.includes(file.type);
        const isVideo = ALLOWED_VIDEO.includes(file.type);
        if (!isImage && !isVideo) {
          toast.error(`${file.name}: use image or video`);
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
            const type = ALLOWED_VIDEO.includes(file.type) ? "video" : "photo";
            return uploadFile(file, (percent) => {
              setUploadProgress((p) => (p + percent) / (i + 1));
            }).then((r) => ({ url: r.url, type, isCover: false }));
          })
        );
        setUploadProgress(100);
        const next = [...media, ...results];
        if (next.length > 0 && !next.some((m) => m.isCover)) next[0]!.isCover = true;
        onMediaChange(next as VenueMediaItem[]);
        toast.success(`${results.length} file(s) uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [media, onMediaChange]
  );

  const setCover = (index: number) => {
    onMediaChange(media.map((m, i) => ({ ...m, isCover: i === index })));
  };

  const remove = (index: number) => {
    const next = media.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((m) => m.isCover)) next[0]!.isCover = true;
    onMediaChange(next);
  };

  return (
    <div className="space-y-2">
      <FileUploader
        accept={[...ALLOWED_IMAGE, ...ALLOWED_VIDEO].join(",")}
        multiple
        maxFiles={MAX_ITEMS}
        maxSizeBytes={MAX_SIZE}
        onFilesSelected={processFiles}
        disabled={isUploading}
        acceptLabel="Photos or videos"
        currentCount={media.length}
        uploadProgress={isUploading ? uploadProgress : undefined}
      />
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item, i) => (
            <div key={`${item.url}-${i}`} className="rounded-lg border overflow-hidden bg-muted flex flex-col">
              <button
                type="button"
                className="relative aspect-video w-full bg-muted block"
                onClick={() => {
                  setPreviewUrl(item.url);
                  setPreviewType(item.type === "video" ? "video" : "image");
                }}
              >
                {item.type === "video" ? (
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <Image src={item.url} alt="" fill className="object-cover" unoptimized />
                )}
                {item.isCover && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </button>
              <div className="p-2 flex items-center justify-between gap-1 border-t bg-background">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setCover(i)}
                  title="Set as cover image"
                >
                  <Star className={`h-3.5 w-3.5 mr-1 ${item.isCover ? "fill-primary text-primary" : ""}`} />
                  {item.isCover ? "Cover" : "Set cover"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={isUploading}
                  aria-label="Remove media"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
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
