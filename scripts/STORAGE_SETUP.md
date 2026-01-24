# Storage Buckets Setup Guide

## Problem

If you're seeing a "bucket not found" error when uploading avatars, it means the required Supabase Storage buckets haven't been created yet.

## Quick Fix

### Option 1: Use the Setup Script (Recommended)

Run the setup script to automatically create the required buckets:

```bash
npx tsx scripts/setup-storage-buckets.ts
```

**Note:** This script requires:
- `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

### Option 2: Manual Setup via Supabase Dashboard

If the script doesn't work, create the buckets manually:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** for each bucket below

#### Bucket 1: `avatars`

- **Name:** `avatars`
- **Public bucket:** ✅ Yes (checked)
- **File size limit:** `2097152` bytes (2MB)
- **Allowed MIME types:** 
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`

#### Bucket 2: `reports` (for future use)

- **Name:** `reports`
- **Public bucket:** ✅ Yes (checked)
- **File size limit:** `52428800` bytes (50MB)
- **Allowed MIME types:**
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `video/*`

## Required Buckets

The application requires the following storage buckets:

| Bucket Name | Purpose | Size Limit | Public |
|------------|---------|------------|--------|
| `avatars` | User profile pictures | 2MB | Yes |
| `reports` | Event report media (future) | 50MB | Yes |
| `venues` | Venue images | 5MB | Yes |

**Note:** The `venues` bucket should already exist if you've set up venue management.

## Verification

After creating the buckets, you can verify they exist by:

1. Checking the Storage section in your Supabase Dashboard
2. Or running the setup script again (it will report that buckets already exist)

## Troubleshooting

### "Bucket not found" error persists

1. Verify the bucket name is exactly `avatars` (case-sensitive)
2. Check that the bucket is set to **Public**
3. Ensure your `NEXT_PUBLIC_SUPABASE_URL` environment variable is correct
4. Check that your service role key has proper permissions

### Setup script fails

If the automated script fails:
- Check that your `.env.local` file has the correct values
- Verify your `SUPABASE_SERVICE_ROLE_KEY` is valid
- Use Option 2 (manual setup) instead
