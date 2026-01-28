-- =============================================
-- Migration 018: Storage RLS Policies
-- =============================================
-- Description: Create Row-Level Security policies for storage buckets
--              to allow authenticated users to upload/read report media
-- Date: 2026-01-08
-- =============================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Authenticated users can upload report media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read report media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update report media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete report media" ON storage.objects;

-- Policy 1: Allow authenticated users to upload files to reports bucket
CREATE POLICY "Authenticated users can upload report media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Policy 2: Allow authenticated users to read files from reports bucket
CREATE POLICY "Authenticated users can read report media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Allow authenticated users to update files in reports bucket
CREATE POLICY "Authenticated users can update report media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Policy 4: Allow authenticated users to delete files from reports bucket
CREATE POLICY "Authenticated users can delete report media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Comments
COMMENT ON POLICY "Authenticated users can upload report media" ON storage.objects IS 
  'Allows authenticated users to upload media files to the reports bucket';

COMMENT ON POLICY "Authenticated users can read report media" ON storage.objects IS 
  'Allows authenticated users to read media files from the reports bucket';

COMMENT ON POLICY "Authenticated users can update report media" ON storage.objects IS 
  'Allows authenticated users to update media files in the reports bucket';

COMMENT ON POLICY "Authenticated users can delete report media" ON storage.objects IS 
  'Allows authenticated users to delete media files from the reports bucket';
