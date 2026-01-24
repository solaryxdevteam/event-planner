/**
 * Storage Data Access Layer (DAL)
 *
 * Pure Supabase Storage operations
 * No business logic - just file upload/download/delete operations
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Upload a file to Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param file - File to upload (Buffer, ArrayBuffer, File, or Blob)
 * @param options - Upload options (contentType, cacheControl, etc.)
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | ArrayBuffer | File | Blob,
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<{ path: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: options?.contentType,
    cacheControl: options?.cacheControl,
    upsert: options?.upsert ?? true,
  });

  if (error) {
    // Provide more helpful error messages for common issues
    if (error.message.includes("Bucket not found") || error.message.includes("does not exist")) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Please run the setup script: npx tsx scripts/setup-storage-buckets.ts`
      );
    }
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return data;
}

/**
 * Delete a file from Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param path - File path in bucket to delete
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    // Provide more helpful error messages for common issues
    if (error.message.includes("Bucket not found") || error.message.includes("does not exist")) {
      throw new Error(
        `Storage bucket "${bucket}" not found. Please run the setup script: npx tsx scripts/setup-storage-buckets.ts`
      );
    }
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get public URL for a file in Supabase Storage
 *
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns Public URL for the file
 */
export function getPublicUrl(bucket: string, path: string): string {
  // Note: This doesn't require async createClient since getPublicUrl is synchronous
  // We'll construct the URL manually if needed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Get signed URL for a private file (expires after specified duration)
 *
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * List files in a bucket folder
 *
 * @param bucket - Storage bucket name
 * @param path - Folder path in bucket
 * @param options - List options (limit, offset, sortBy, etc.)
 */
export async function listFiles(
  bucket: string,
  path: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: "asc" | "desc" };
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: options?.limit,
    offset: options?.offset,
    sortBy: options?.sortBy,
  });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
}
