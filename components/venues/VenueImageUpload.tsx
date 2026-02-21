"use client";

import { useState, useRef, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

interface VenueImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  venueId?: string;
  error?: string;
  onFilesChange?: (files: File[]) => void;
}

function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      errors.push(`Invalid type: ${file.name}. Use JPEG, PNG, GIF, or WebP.`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`Too large: ${file.name}. Max 5MB.`);
      continue;
    }
    valid.push(file);
  }
  return { valid, errors };
}

const UPLOAD_ENDPOINT = "/api/venues/upload-image";

/** Upload one file with progress. Uses XHR so we can report upload progress (fetch doesn't support it). */
function uploadOne(file: File, onProgress: (percent: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("image", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      onProgress(100);
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      let body: { url?: string; error?: string };
      try {
        body = isJson ? JSON.parse(xhr.responseText || "{}") : {};
      } catch {
        reject(new Error("Invalid response from server"));
        return;
      }
      if (xhr.status === 200 && body.url) {
        resolve({ url: body.url });
      } else {
        reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    xhr.open("POST", UPLOAD_ENDPOINT);
    xhr.send(formData);
  });
}

export function VenueImageUpload({
  images,
  onImagesChange,
  venueId: _unusedVenueId,
  error,
  onFilesChange,
}: VenueImageUploadProps) {
  // venueId is part of the interface but not currently used
  void _unusedVenueId;
  const [isUploading, setIsUploading] = useState(false);
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const processFiles = useCallback(
    async (fileList: File[]): Promise<void> => {
      const slotsLeft = MAX_IMAGES - images.length;
      if (slotsLeft <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const { valid, errors } = validateFiles(fileList);
      if (errors.length > 0) {
        errors.forEach((msg) => toast.error(msg));
      }
      if (valid.length === 0) return;

      const filesToUpload = valid.slice(0, slotsLeft);
      const previewUrlMap = new Map<number, string>();
      const startIndex = images.length;

      filesToUpload.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        previewUrlMap.set(i, url);
      });

      const previewUrls = filesToUpload.map((_, i) => previewUrlMap.get(i)!);
      onImagesChange([...images, ...previewUrls]);
      setIsUploading(true);
      filesToUpload.forEach((_, i) => setUploadProgress((p) => ({ ...p, [startIndex + i]: 0 })));

      try {
        const results = await Promise.all(
          filesToUpload.map((file, index) => {
            const fileIndex = startIndex + index;
            return uploadOne(file, (percent) => {
              setUploadProgress((p) => ({ ...p, [fileIndex]: percent }));
            }).then((res) => ({ ...res, file, index }));
          })
        );

        const finalImages = [...images];
        const newTempFiles: File[] = [];
        results.forEach(({ url, file, index }) => {
          finalImages[startIndex + index] = url;
          newTempFiles.push(file);
          const previewUrl = previewUrlMap.get(index);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
        });

        onImagesChange(finalImages);
        const updatedTempFiles = [...tempFiles, ...newTempFiles];
        setTempFiles(updatedTempFiles);
        onFilesChange?.(updatedTempFiles);
        toast.success(`${results.length} image(s) uploaded`);
      } catch (err) {
        onImagesChange(images);
        previewUrlMap.forEach((url) => URL.revokeObjectURL(url));
        toast.error(err instanceof Error ? err.message : "Failed to upload images");
      } finally {
        setIsUploading(false);
        setUploadProgress({});
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [images, tempFiles, onImagesChange, onFilesChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      processFiles(Array.from(files));
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isUploading || images.length >= MAX_IMAGES) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) processFiles(files);
    },
    [isUploading, images.length, processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveImage = async (index: number) => {
    if (isUploading) {
      toast.warning("Please wait for uploads to complete");
      return;
    }

    const imageUrl = images[index];
    const isUploadedImage = imageUrl && !imageUrl.startsWith("blob:") && imageUrl.includes("/storage/");

    // Remove from images array immediately
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    // Remove from temp files array (simple index-based removal)
    const newTempFiles = tempFiles.filter((_, i) => i !== index);
    setTempFiles(newTempFiles);
    onFilesChange?.(newTempFiles);

    // If it's an uploaded image (not a preview), delete from storage
    if (isUploadedImage) {
      try {
        // Call API to delete the image
        const response = await fetch("/api/venues/delete-image", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
          console.warn("Failed to delete image from storage, but removed from UI");
        }
      } catch (error) {
        // Log error but don't block - image is already removed from UI
        console.error("Error deleting image from storage:", error);
      }
    }

    toast.success("Image removed");
  };

  return (
    <div className="space-y-2">
      <Label>
        Images / Floor Plans <span className="text-muted-foreground">(1-5 images)</span>
      </Label>

      <div className="space-y-4">
        {/* File input: label association ensures clicking "Choose files" opens the system picker */}
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          onChange={handleInputChange}
          disabled={isUploading || images.length >= MAX_IMAGES}
          className="sr-only"
          aria-label="Choose venue images"
        />

        {/* Drop zone + Upload button + overall progress */}
        {(() => {
          const progressEntries = Object.entries(uploadProgress);
          const totalUploading = progressEntries.length;
          const overallPercent =
            totalUploading > 0 ? Math.round(progressEntries.reduce((sum, [, p]) => sum + p, 0) / totalUploading) : 0;
          const completedCount = progressEntries.filter(([, p]) => p >= 100).length;
          return (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
            relative rounded-lg border-2 border-dashed transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isUploading || images.length >= MAX_IMAGES ? "pointer-events-none opacity-60" : ""}
          `}
            >
              <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
                {isUploading ? (
                  <>
                    <p className="text-sm font-medium">
                      Uploading {completedCount} of {totalUploading} image{totalUploading !== 1 ? "s" : ""}
                    </p>
                    <Progress value={overallPercent} className="w-full max-w-xs h-2.5" />
                    <p className="text-xs text-muted-foreground">{overallPercent}%</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      {isDragging ? "Drop images here" : "Drag and drop images here, or"}
                    </p>
                    <Label htmlFor={inputId} className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openFilePicker}
                        disabled={images.length >= MAX_IMAGES}
                        asChild
                      >
                        <span>
                          {images.length >= MAX_IMAGES ? `Maximum ${MAX_IMAGES} images reached` : "Choose files"}
                        </span>
                      </Button>
                    </Label>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((url, index) => {
              const progress = uploadProgress[index];
              const isUploadingThis = progress !== undefined && progress < 100;

              return (
                <div key={`${url}-${index}`} className="relative group">
                  <div
                    className="aspect-video rounded-md border border-input overflow-hidden bg-muted relative cursor-pointer"
                    onClick={() => !isUploadingThis && !isUploading && setSelectedImageIndex(index)}
                  >
                    <Image
                      src={url}
                      alt={`Venue image ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                      width={100}
                      height={100}
                    />
                    {isUploadingThis && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="text-white text-sm font-medium mb-2">{progress}%</div>
                        <Progress value={progress} className="w-3/4 h-2" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    disabled={isUploadingThis || isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Image View Dialog */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={(open) => !open && setSelectedImageIndex(null)}>
        <DialogContent className="!max-w-4xl !w-full p-0" showCloseButton={false}>
          <VisuallyHidden.Root>
            <DialogTitle>Venue Image {selectedImageIndex !== null ? selectedImageIndex + 1 : ""}</DialogTitle>
          </VisuallyHidden.Root>
          {selectedImageIndex !== null && images[selectedImageIndex] && (
            <div className="relative w-full aspect-video">
              <Image
                src={images[selectedImageIndex]}
                alt={`Venue image ${selectedImageIndex + 1}`}
                fill
                className="object-cover rounded-lg"
                unoptimized
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 rounded-full bg-white hover:bg-gray-100 h-10 w-10 shadow-md z-10"
                onClick={() => setSelectedImageIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
