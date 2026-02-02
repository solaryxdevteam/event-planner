"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatar, removeAvatar } from "@/lib/actions/profile";
import type { User } from "@/lib/types/database.types";

interface AvatarUploadProps {
  user: User;
}

export function AvatarUpload({ user }: AvatarUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Check if user is pending - if so, disable upload
  const isPending = user.status === "pending";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return uploadAvatar(formData);
    },
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate profile queries
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        toast.success("Avatar uploaded successfully");
        setPreview(null);
      } else {
        toast.error(response.error || "Failed to upload avatar");
        setPreview(null);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload avatar");
      setPreview(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate profile queries
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        toast.success("Avatar removed successfully");
      } else {
        toast.error(response.error || "Failed to remove avatar");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove avatar");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadMutation.mutate(file);
  };

  const handleRemove = () => {
    if (confirm("Are you sure you want to remove your avatar?")) {
      removeMutation.mutate();
    }
  };

  const getInitials = () => {
    const firstName = user.first_name?.[0] || "";
    const lastName = user.last_name?.[0] || "";
    return `${firstName}${lastName}`.toUpperCase() || user.email[0].toUpperCase();
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatar_url || undefined} alt={user.first_name} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">Profile Picture</p>
            <p className="text-sm text-muted-foreground">
              Your account is pending activation. You cannot update your avatar until your account is activated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={preview || user.avatar_url || undefined} alt={user.first_name} />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Profile Picture</p>
            <p className="text-sm text-muted-foreground">JPG, PNG, GIF or WebP. Max size 2MB.</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending || removeMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
            {user.avatar_url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={uploadMutation.isPending || removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
