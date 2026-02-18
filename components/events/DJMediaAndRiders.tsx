"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, FileText } from "lucide-react";
import { MediaPreviewDialog } from "@/components/ui/media-preview-dialog";

type RiderItem = { url: string; type: string };

interface DJMediaAndRidersProps {
  pictureUrl: string | null;
  technicalRider: RiderItem[] | null | undefined;
  hospitalityRider: RiderItem[] | null | undefined;
}

function RiderMediaSection({
  title,
  items,
  onPreview,
}: {
  title: string;
  items: RiderItem[];
  onPreview: (url: string, type: "image" | "video") => void;
}) {
  const photos = items.filter((m) => m.type === "photo");
  const videos = items.filter((m) => m.type === "video");
  const files = items.filter((m) => m.type === "file");

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {title}
      </h4>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              <button
                type="button"
                className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                onClick={() => onPreview(item.url, "image")}
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
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {videos.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
            >
              <button
                type="button"
                className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                onClick={() => onPreview(item.url, "video")}
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
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item, index) => (
            <li key={`${item.url}-${index}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{item.url.split("/").pop() ?? "File"}</span>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DJMediaAndRiders({ pictureUrl, technicalRider, hospitalityRider }: DJMediaAndRidersProps) {
  const [preview, setPreview] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const techList = technicalRider && Array.isArray(technicalRider) ? technicalRider : [];
  const hospList = hospitalityRider && Array.isArray(hospitalityRider) ? hospitalityRider : [];
  const hasPicture = !!pictureUrl;
  const hasAny = hasPicture || techList.length > 0 || hospList.length > 0;

  if (!hasAny) return null;

  const openPreview = (url: string, type: "image" | "video") => {
    setPreview({ url, type });
  };

  return (
    <>
      {hasPicture && (
        <div className="space-y-2">
          <div className="relative h-48 w-full rounded-lg overflow-hidden bg-muted group">
            <button
              type="button"
              className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              onClick={() => openPreview(pictureUrl!, "image")}
            >
              <Image src={pictureUrl!} alt="DJ" fill className="object-cover" unoptimized />
            </button>
            <a
              href={pictureUrl!}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1 right-1 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <RiderMediaSection title="Technical rider" items={techList} onPreview={openPreview} />
      <RiderMediaSection title="Hospitality rider" items={hospList} onPreview={openPreview} />

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
