/**
 * Storage Service
 *
 * Business logic for file storage operations
 */

import * as storageDal from "@/lib/data-access/storage.dal";

/**
 * Upload user avatar
 *
 * @param userId - User ID
 * @param file - Avatar image file
 * @returns Public URL of uploaded avatar
 */
export async function uploadAvatar(userId: string, file: File | Buffer | Blob): Promise<string> {
  // Generate unique filename to avoid collisions
  const timestamp = Date.now();
  const extension = file instanceof File ? file.name.split(".").pop() : "jpg";
  const filename = `${userId}-${timestamp}.${extension}`;
  // Path should be relative to bucket root, not include bucket name
  const path = filename;

  // Upload file to avatars bucket
  await storageDal.uploadFile("avatars", path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
    cacheControl: "3600", // Cache for 1 hour
    upsert: true,
  });

  // Return public URL
  return storageDal.getPublicUrl("avatars", path);
}

/**
 * Delete user avatar
 *
 * @param userId - User ID
 * @param avatarUrl - Current avatar URL to delete
 */
export async function deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
  if (!avatarUrl) return;

  try {
    // Extract path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/avatars/{filename}
    const urlParts = avatarUrl.split("/avatars/");
    if (urlParts.length === 2) {
      const filename = urlParts[1];
      // Path should be relative to bucket root, not include bucket name
      await storageDal.deleteFile("avatars", filename);
    }
  } catch (error) {
    // Log error but don't throw - avatar deletion is not critical
    console.error("Failed to delete avatar:", error);
  }
}

/**
 * Upload event report media (photos/videos)
 *
 * @param eventId - Event ID
 * @param file - Media file
 * @returns Public URL of uploaded media
 */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function uploadReportMedia(eventId: string, file: File | Buffer | Blob): Promise<string> {
  const timestamp = Date.now();
  let extension = "jpg";
  let contentType = "image/jpeg";
  if (file instanceof File) {
    extension = file.name.split(".").pop() ?? MIME_TO_EXT[file.type] ?? "jpg";
    contentType = file.type || contentType;
  } else if (file instanceof Blob && file.type) {
    extension = MIME_TO_EXT[file.type] ?? file.type.split("/")[1] ?? "jpg";
    contentType = file.type;
  }
  const filename = `${eventId}-${timestamp}.${extension}`;
  const path = `reports/${eventId}/${filename}`;

  await storageDal.uploadFile("reports", path, file, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  });

  // Return public URL
  return storageDal.getPublicUrl("reports", path);
}

/**
 * Delete event report media
 *
 * @param eventId - Event ID
 * @param mediaUrl - Media URL to delete
 */
export async function deleteReportMedia(eventId: string, mediaUrl: string): Promise<void> {
  if (!mediaUrl) return;

  try {
    // Extract path from URL
    const urlParts = mediaUrl.split("/reports/");
    if (urlParts.length === 2) {
      const path = `reports/${urlParts[1]}`;
      await storageDal.deleteFile("reports", path);
    }
  } catch (error) {
    console.error("Failed to delete report media:", error);
  }
}

/**
 * Get all media files for an event report
 *
 * @param eventId - Event ID
 * @returns Array of media file metadata
 */
export async function getEventReportMedia(eventId: string) {
  const files = await storageDal.listFiles("reports", `reports/${eventId}`, {
    sortBy: { column: "created_at", order: "desc" },
  });

  // Convert to public URLs
  return files.map((file) => ({
    name: file.name,
    url: storageDal.getPublicUrl("reports", `reports/${eventId}/${file.name}`),
    createdAt: file.created_at,
    size: file.metadata?.size,
  }));
}

/**
 * Upload venue image
 *
 * @param venueId - Venue ID
 * @param file - Image file
 * @returns Public URL of uploaded image
 */
export async function uploadVenueImage(venueId: string, file: File | Buffer | Blob): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file instanceof File ? file.name.split(".").pop() : "jpg";
  const filename = `${venueId}-${timestamp}-${random}.${extension}`;
  const path = `venues/${venueId}/${filename}`;

  // Upload file to venues bucket
  await storageDal.uploadFile("venues", path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
    cacheControl: "3600",
    upsert: true,
  });

  // Return public URL
  return storageDal.getPublicUrl("venues", path);
}

/**
 * Upload temporary venue image (before venue creation)
 * Images are stored in a temporary location and can be moved after venue creation
 *
 * @param userId - User ID for temporary storage
 * @param file - Image file
 * @returns Public URL of uploaded image
 */
export async function uploadTemporaryVenueImage(userId: string, file: File | Buffer | Blob): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file instanceof File ? file.name.split(".").pop() : "jpg";
  const filename = `temp-${userId}-${timestamp}-${random}.${extension}`;
  const path = `venues/temp/${userId}/${filename}`;

  // Upload file to venues bucket in temp folder
  await storageDal.uploadFile("venues", path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
    cacheControl: "3600",
    upsert: true,
  });

  // Return public URL
  return storageDal.getPublicUrl("venues", path);
}

/**
 * Upload temporary venue file (floor plan or media: image, video, PDF)
 * Used before venue creation or for any venue file upload
 */
export async function uploadTemporaryVenueFile(userId: string, file: File | Buffer | Blob): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file instanceof File ? file.name.split(".").pop() || "bin" : "bin";
  const filename = `temp-${userId}-${timestamp}-${random}.${extension}`;
  const path = `venues/temp/${userId}/${filename}`;

  await storageDal.uploadFile("venues", path, file, {
    contentType: file instanceof File ? file.type : "application/octet-stream",
    cacheControl: "3600",
    upsert: true,
  });

  return storageDal.getPublicUrl("venues", path);
}

/**
 * Delete venue image
 *
 * @param venueId - Venue ID
 * @param imageUrl - Image URL to delete
 */
export async function deleteVenueImage(venueId: string, imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    // Extract path from URL
    const urlParts = imageUrl.split("/venues/");
    if (urlParts.length === 2) {
      const path = `venues/${urlParts[1]}`;
      await storageDal.deleteFile("venues", path);
    }
  } catch (error) {
    console.error("Failed to delete venue image:", error);
  }
}

/**
 * Upload temporary DJ file (picture, technical rider, hospitality rider)
 * Uses venues bucket with djs/ prefix
 */
export async function uploadTemporaryDjFile(userId: string, file: File | Buffer | Blob): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = file instanceof File ? file.name.split(".").pop() || "bin" : "bin";
  const filename = `temp-${userId}-${timestamp}-${random}.${extension}`;
  const path = `djs/temp/${userId}/${filename}`;

  await storageDal.uploadFile("venues", path, file, {
    contentType: file instanceof File ? file.type : "application/octet-stream",
    cacheControl: "3600",
    upsert: true,
  });

  return storageDal.getPublicUrl("venues", path);
}

/**
 * Upload event marketing file (flyer, video, or strategy).
 * Path: reports/events/{eventId}/marketing/flyers|videos|strategies/
 */
export async function uploadEventMarketingFile(
  eventId: string,
  file: File | Buffer | Blob,
  type: "flyer" | "video" | "strategy"
): Promise<{ url: string; name: string }> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const name = file instanceof File ? file.name : `upload-${timestamp}.bin`;
  const extension = file instanceof File ? file.name.split(".").pop() || "bin" : "bin";
  const filename = `${timestamp}-${random}.${extension}`;
  const folder = type === "strategy" ? "strategies" : `${type}s`;
  const path = `events/${eventId}/marketing/${folder}/${filename}`;

  await storageDal.uploadFile("reports", path, file, {
    contentType: file instanceof File ? file.type : "application/octet-stream",
    cacheControl: "3600",
    upsert: true,
  });

  const url = storageDal.getPublicUrl("reports", path);
  return { url, name };
}

/**
 * Upload proposed event file (ticket or table) during event form.
 * Stored in reports bucket under events/temp/{userId}/ so it can be used before event exists.
 */
export async function uploadProposedEventFile(userId: string, file: File | Buffer | Blob): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const name = file instanceof File ? file.name : `upload-${timestamp}.bin`;
  const extension = file instanceof File ? name.split(".").pop() || "bin" : "bin";
  const filename = `${timestamp}-${random}.${extension}`;
  const path = `events/temp/${userId}/${filename}`;

  // For PDF, omit contentType so the bucket does not reject on MIME check (some buckets only allow image/video).
  // The file keeps the .pdf extension so the URL still opens as PDF in browsers.
  const rawType = file instanceof File ? file.type : "application/octet-stream";
  const isPdf =
    rawType === "application/pdf" ||
    rawType === "application/x-pdf" ||
    (file instanceof File && (file.name || "").toLowerCase().endsWith(".pdf"));
  const uploadOptions: { contentType?: string; cacheControl: string; upsert: boolean } = {
    cacheControl: "3600",
    upsert: true,
  };
  if (!isPdf) {
    uploadOptions.contentType = rawType;
  }

  await storageDal.uploadFile("reports", path, file, uploadOptions);

  return storageDal.getPublicUrl("reports", path);
}
