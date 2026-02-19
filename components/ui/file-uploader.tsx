"use client";

import { useRef, useId, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface FileUploaderProps {
  /** HTML accept attribute for the file input (e.g. "image/*,.pdf" or "image/jpeg,image/png,video/mp4") */
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  /** Called with selected/dropped files after validation. Caller can filter by type/size. */
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  /** Human-readable description of allowed formats (e.g. "PDF or images") */
  acceptLabel?: string;
  /** Current number of items (to show "Max N files" and disable when at limit) */
  currentCount?: number;
  /** When provided, show progress 0-100 during uploads */
  uploadProgress?: number;
  /** Custom content when not uploading (replaces default icon + text + button) */
  children?: React.ReactNode;
  className?: string;
}

export function FileUploader({
  accept,
  multiple = true,
  maxFiles = 10,
  maxSizeBytes = 20 * 1024 * 1024,
  onFilesSelected,
  disabled = false,
  acceptLabel,
  currentCount = 0,
  uploadProgress,
  children,
  className = "",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const validateAndEmit = useCallback(
    (fileList: File[]) => {
      const files = Array.from(fileList);
      const remaining = Math.max(0, maxFiles - currentCount);
      if (remaining <= 0) return;
      const toEmit = files.slice(0, remaining);
      const valid: File[] = [];
      for (const file of toEmit) {
        if (file.size > maxSizeBytes) continue;
        valid.push(file);
      }
      if (valid.length) onFilesSelected(valid);
    },
    [maxFiles, maxSizeBytes, currentCount, onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) {
        validateAndEmit(Array.from(files));
        e.target.value = "";
      }
    },
    [validateAndEmit]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || currentCount >= maxFiles) return;
      const files = e.dataTransfer.files;
      if (files?.length) validateAndEmit(Array.from(files));
    },
    [disabled, currentCount, maxFiles, validateAndEmit]
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

  const atLimit = currentCount >= maxFiles;
  const showProgress = uploadProgress !== undefined;

  return (
    <div className={className}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        disabled={disabled || atLimit}
        className="sr-only"
        aria-label="Choose files"
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          rounded-lg border-1 border-dashed p-0 flex flex-col items-center justify-center gap-2 min-h-[100px]
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${disabled || atLimit ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {showProgress ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs min-h-[80px] justify-center">
            <Progress value={uploadProgress} className="w-full h-3" />
            <span className="text-sm font-medium text-muted-foreground">
              {uploadProgress >= 100 ? "Complete" : `Uploading... ${Math.round(uploadProgress)}%`}
            </span>
          </div>
        ) : children ? (
          children
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || atLimit}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              {atLimit ? `Maximum ${maxFiles} files` : "Choose files"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {acceptLabel && `${acceptLabel}. `}
              Max {maxFiles} files, {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB each.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
