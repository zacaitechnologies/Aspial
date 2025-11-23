# Fix Storage Policies - Quick Guide

## The Problem

Your policies are checking for folder ownership (`storage.foldername(name)`), but files are uploaded directly to the bucket root. This causes the RLS policy error.

## The Solution

Update your INSERT policy to remove the folder check. Here are two options:

### Option 1: Edit Existing Policy (Recommended)

1. Go to **Supabase Dashboard** → **Storage** → **Policies** → **OTHER POLICIES UNDER STORAGE.OBJECTS**
2. Find the policy: **"Users can upload their own profile pictures"** (INSERT)
3. Click the **three dots (⋮)** on the right → **Edit**
4. In the **WITH CHECK** expression, change it to:
   ```
   bucket_id = 'profile-pictures'
   ```
5. Remove any folder ownership checks like `(storage.foldername(name))[1] = auth.uid()::text`
6. Click **Save**

### Option 2: Delete and Recreate (If editing doesn't work)

1. Delete the existing INSERT policy
2. Create a new one with these settings:
   - **Policy name**: `Allow authenticated uploads`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**: `bucket_id = 'profile-pictures'`
   - **USING expression**: (leave empty)

## Quick SQL Fix

Or run this SQL in **Supabase SQL Editor** to fix the INSERT policy:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;

-- Create a simpler policy
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');
```

## Verify Other Policies

Make sure your other policies also use simple bucket checks:

- **SELECT**: `bucket_id = 'profile-pictures'` (should work as-is)
- **UPDATE**: `bucket_id = 'profile-pictures'` (remove folder checks if present)
- **DELETE**: `bucket_id = 'profile-pictures'` (remove folder checks if present)

After fixing the INSERT policy, try uploading again!

