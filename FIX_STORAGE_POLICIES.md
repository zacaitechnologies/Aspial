-- 1. CLEAN UP: Drop all existing policies by name to avoid conflicts across both buckets.
-----------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON storage.objects;


-- 2. POLICY RE-CREATION: Define the policies for both the 'profile-pictures' and 'contracts' buckets.
------------------------------------------------------------------------------------------------------

-- A. Policies for 'profile-pictures' Bucket (Owner-Only Write, Public Read)

-- Policy A1: INSERT (Upload)
-- Allows authenticated users to upload files to 'profile-pictures' IF the filename starts with their UUID.
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'profile-pictures')
  AND name LIKE ((auth.uid())::text || '-%')
);

-- Policy A2: SELECT (View)
-- Allows ANY user (public) to view files in the 'profile-pictures' bucket.
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'profile-pictures'
);

-- Policy A3: UPDATE (Modify)
-- Allows authenticated users to update files in 'profile-pictures' ONLY if the name matches their UUID prefix.
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  (bucket_id = 'profile-pictures')
  AND name LIKE ((auth.uid())::text || '-%')
)
WITH CHECK (
  (bucket_id = 'profile-pictures')
  AND name LIKE ((auth.uid())::text || '-%')
);

-- Policy A4: DELETE (Remove)
-- Allows authenticated users to delete files in 'profile-pictures' ONLY if the name starts with their UUID.
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  (bucket_id = 'profile-pictures')
  AND name LIKE ((auth.uid())::text || '-%')
);


-- B. Policies for 'contracts' Bucket (Authenticated Write, Public Read)

-- Policy B1: INSERT (Upload)
-- Allows any authenticated user to upload files to the 'contracts' bucket.
CREATE POLICY "Users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
);

-- Policy B2: SELECT (View)
-- Allows ANY user (public) to view files in the 'contracts' bucket.
CREATE POLICY "Anyone can view contracts"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'contracts'
);

-- Policy B3: UPDATE (Modify)
-- Allows any authenticated user to update files in the 'contracts' bucket.
CREATE POLICY "Authenticated users can update contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts'
)
WITH CHECK (
  bucket_id = 'contracts'
);

-- Policy B4: DELETE (Remove)
-- Allows any authenticated user to delete files in the 'contracts' bucket.
CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
);