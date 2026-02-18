"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface MediaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "image" | "video" | "file";
  url: string;
  /** Optional filename for download */
  downloadName?: string;
  /** Optional MIME type for file (e.g. application/pdf) */
  mimeType?: string;
}

export function MediaPreviewDialog({ open, onOpenChange, type, url, downloadName, mimeType }: MediaPreviewDialogProps) {
  const hasValidUrl = url != null && url !== "";
  const isPdf = mimeType === "application/pdf" || (downloadName?.toLowerCase().endsWith(".pdf") ?? false);

  const handleDownload = () => {
    if (!hasValidUrl) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName || (type === "image" ? "image" : type === "video" ? "video" : "file");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  const handleOpenInNewTab = () => {
    if (!hasValidUrl) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 overflow-hidden flex flex-col border-0 "
        showCloseButton={true}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Media preview</DialogTitle>
        <div className="absolute top-3 right-14 z-50 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="rounded-full"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          {(type === "file" || isPdf) && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleOpenInNewTab}
              className="rounded-full"
              aria-label="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0 p-2">
          {hasValidUrl && type === "image" && (
            <div className="flex items-center justify-center w-full h-full min-w-0 min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Preview"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          {hasValidUrl && type === "video" && (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[85vh] w-auto max-h-[85vh] object-contain"
              crossOrigin="anonymous"
            />
          )}
          {hasValidUrl && type === "file" && isPdf && (
            <iframe src={`${url}#toolbar=0`} title="PDF preview" className="w-full h-[85vh] border-0 rounded min-h-0" />
          )}
          {hasValidUrl && type === "file" && !isPdf && (
            <div className="flex flex-col items-center justify-center gap-4 text-white p-8">
              <p className="text-sm text-center">Preview not available for this file type.</p>
              <Button variant="secondary" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download {downloadName || "file"}
              </Button>
              <Button variant="outline" onClick={handleOpenInNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
