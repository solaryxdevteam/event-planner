"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface VenueImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  venueId?: string; // For new venues, this will be undefined until saved
  error?: string;
  onFilesChange?: (files: File[]) => void; // Callback to track File objects
}

export function VenueImageUpload({ images, onImagesChange, venueId, error, onFilesChange }: VenueImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxImages = 5;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only JPEG, PNG, GIF, and WebP images are allowed.`);
        continue;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}. Maximum size is 5MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const filesToUpload = validFiles.slice(0, maxImages - images.length);
    const previewUrls: string[] = [];
    const previewUrlMap = new Map<number, string>(); // Map file index to preview URL

    // Create preview URLs immediately and show them
    filesToUpload.forEach((file, index) => {
      const fileIndex = images.length + index;
      const previewUrl = URL.createObjectURL(file);
      previewUrls.push(previewUrl);
      previewUrlMap.set(index, previewUrl);
      setUploadProgress((prev) => ({ ...prev, [fileIndex]: 0 }));
    });

    // Show previews immediately
    const currentImages = [...images];
    onImagesChange([...currentImages, ...previewUrls]);

    try {
      // Upload images immediately using the API endpoint with progress tracking
      const uploadPromises = filesToUpload.map(async (file, index) => {
        const fileIndex = images.length + index;

        const formData = new FormData();
        formData.append("image", file);

        // Create XMLHttpRequest for progress tracking
        return new Promise<{ url: string; file: File; previewIndex: number }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress((prev) => ({ ...prev, [fileIndex]: percentComplete }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              try {
                // Check if response is JSON
                const contentType = xhr.getResponseHeader("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const result = JSON.parse(xhr.responseText);
                  setUploadProgress((prev) => ({ ...prev, [fileIndex]: 100 }));
                  resolve({ url: result.url, file, previewIndex: index });
                } else {
                  // Response is not JSON (likely HTML error page)
                  reject(new Error("Server returned invalid response. Please try again."));
                }
              } catch (error) {
                reject(new Error("Failed to parse response"));
              }
            } else {
              try {
                // Try to parse as JSON first
                const contentType = xhr.getResponseHeader("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const error = JSON.parse(xhr.responseText);
                  reject(new Error(error.error || "Failed to upload image"));
                } else {
                  // HTML error page or other non-JSON response
                  reject(new Error(`Upload failed with status ${xhr.status}. Please try again.`));
                }
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload was aborted"));
          });

          xhr.open("POST", "/api/venues/upload-image");
          xhr.send(formData);
        });
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Replace preview URLs with actual uploaded URLs
      const finalImages = [...images];
      const newTempFiles: File[] = [];

      uploadResults.forEach((result) => {
        const previewIndex = images.length + result.previewIndex;
        finalImages[previewIndex] = result.url;
        newTempFiles.push(result.file);
        // Revoke the preview URL
        const previewUrl = previewUrlMap.get(result.previewIndex);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      });

      onImagesChange(finalImages);
      const updatedTempFiles = [...tempFiles, ...newTempFiles];
      setTempFiles(updatedTempFiles);
      onFilesChange?.(updatedTempFiles);

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress({});
      }, 500);

      toast.success(`${uploadResults.length} image(s) uploaded successfully`);
    } catch (error) {
      // Remove preview images on error
      onImagesChange(images);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      toast.error(error instanceof Error ? error.message : "Failed to upload images");
      // Remove any partial uploads from progress
      setUploadProgress({});
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
        // Extract path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/venues/{path}
        const urlParts = imageUrl.split("/venues/");
        if (urlParts.length === 2) {
          const path = `venues/${urlParts[1]}`;

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
        }
      } catch (error) {
        // Log error but don't block - image is already removed from UI
        console.error("Error deleting image from storage:", error);
      }
    }

    toast.success("Image removed");
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label>
        Images / Floor Plans <span className="text-muted-foreground">(1-5 images)</span>
      </Label>

      <div className="space-y-4">
        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading || images.length >= maxImages}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading || images.length >= maxImages}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading
              ? "Uploading..."
              : images.length >= maxImages
                ? `Maximum ${maxImages} images reached`
                : `Upload Images (${images.length}/${maxImages})`}
          </Button>
        </div>

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
                    <img src={url} alt={`Venue image ${index + 1}`} className="w-full h-full object-cover" />
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

        {/* Empty State */}
        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-md bg-muted/50">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              No images uploaded yet. Click the button above to upload.
            </p>
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
            <div className="relative w-full">
              <img
                src={images[selectedImageIndex]}
                alt={`Venue image ${selectedImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-cover rounded-lg"
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
