"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Video, ImageIcon, FileText } from "lucide-react";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

type MediaItem = { url: string; type: string; isCover?: boolean };
type FloorPlanItem = string | { url: string; name?: string };

interface VenueMediaAndFloorPlansProps {
  media: MediaItem[] | null | undefined;
  floorPlans: FloorPlanItem[] | null | undefined;
}

export function VenueMediaAndFloorPlans({ media, floorPlans }: VenueMediaAndFloorPlansProps) {
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const mediaList = media && Array.isArray(media) ? media : [];
  const photos = mediaList.filter((m) => m.type === "photo");
  const videos = mediaList.filter((m) => m.type === "video");
  const plans = floorPlans && Array.isArray(floorPlans) ? floorPlans : [];

  const openPreview = (url: string, type: "image" | "video") => {
    setPreview({ url, type });
  };

  const getPlanUrl = (item: FloorPlanItem): string => (typeof item === "string" ? item : item.url);
  const getPlanName = (item: FloorPlanItem, index: number): string =>
    typeof item === "string" ? `Floor plan ${index + 1}` : item.name || `Floor plan ${index + 1}`;

  if (mediaList.length === 0 && plans.length === 0) return null;

  return (
    <>
      {/* Photos */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Photos
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
              >
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                  onClick={() => openPreview(item.url, "image")}
                >
                  <Image
                    src={item.url}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="120px"
                  />
                </button>
                <a
                  href={item.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-1 right-1 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            Videos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {videos.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
              >
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                  onClick={() => openPreview(item.url, "video")}
                >
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                </button>
                <a
                  href={item.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-1 right-1 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floor plans */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Floor plans
          </h4>
          <ul className="space-y-2">
            {plans.map((item, index) => {
              const url = getPlanUrl(item);
              const name = getPlanName(item, index);
              return (
                <li key={`${url}-${index}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{name}</span>
                    <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {preview && (
        <MediaPreviewDialog
          open={!!preview}
          onOpenChange={(open) => !open && setPreview(null)}
          type={preview.type}
          url={preview.url}
        />
      )}
    </>
  );
}
