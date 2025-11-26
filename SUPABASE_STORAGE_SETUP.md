# Supabase Storage Bucket Setup

## Best Practice: Manual Setup (Recommended)

The recommended approach is to create the storage bucket manually in the Supabase Dashboard. This is more secure and follows infrastructure-as-code principles.

### Steps to Create Bucket Manually:

1. Go to your **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Name it: `profile-pictures`
4. Set it to **Public** (so images can be accessed via URL)
5. Configure settings:
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
6. Click **"Create bucket"**

### Set Up RLS Policies (REQUIRED):

After creating the bucket, you **MUST** set up Row Level Security policies. The bucket will not work without these policies.

1. Go to your **Supabase Dashboard** → **Storage** → `profile-pictures` → **Policies**
2. Click **"New Policy"** and add the following policies:

#### Policy 1: Allow authenticated users to upload their own profile pictures (INSERT)

```sql
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Or simpler version** (if filename starts with user ID):
```sql
CREATE POLICY "Users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
);
```

#### Policy 2: Allow authenticated users to read profile pictures (SELECT)

```sql
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

#### Policy 3: Allow users to update their own profile pictures (UPDATE)

```sql
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Or simpler version**:
```sql
CREATE POLICY "Users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');
```

#### Policy 4: Allow users to delete their own profile pictures (DELETE)

```sql
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Or simpler version**:
```sql
CREATE POLICY "Users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');
```

### Quick Setup (Simplified Policies)

If you want to allow all authenticated users to manage all profile pictures (simpler but less restrictive):

1. Go to **Storage** → `profile-pictures` → **Policies**
2. Click **"New Policy"** → **"For full customization"**
3. Add these 4 policies:

**INSERT Policy:**
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'profile-pictures'`
- WITH CHECK expression: `bucket_id = 'profile-pictures'`

**SELECT Policy:**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'profile-pictures'`

**UPDATE Policy:**
- Policy name: `Allow authenticated updates`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'profile-pictures'`
- WITH CHECK expression: `bucket_id = 'profile-pictures'`

**DELETE Policy:**
- Policy name: `Allow authenticated deletes`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'profile-pictures'`

## Automatic Setup Script (Recommended)

The easiest way to set up everything automatically is to use the setup script:

1. **Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`**:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   You can find your service role key in: **Supabase Dashboard** → **Settings** → **API** → **service_role key**

2. **Run the setup script**:
   ```bash
   npm run setup:storage
   ```

This script will:
- ✅ Create the `profile-pictures` bucket if it doesn't exist
- ✅ Generate the SQL for RLS policies
- ✅ Attempt to create policies automatically (if possible)
- ✅ Provide SQL to run manually if automatic creation fails

**Note**: The service role key has admin access - keep it secure and never expose it in client-side code!

### Manual SQL Execution (if script can't create policies)

If the script can't create policies automatically, it will output SQL that you can run manually:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the SQL provided by the script
3. Click **"Run"**

The SQL will create all 4 required policies.

## Troubleshooting

### Error: "new row violates row-level security policy"

This means RLS policies are not set up correctly. Follow the **"Set Up RLS Policies"** section above.

**Quick fix**: If you just want to get it working quickly, you can temporarily disable RLS:
1. Go to **Storage** → `profile-pictures` → **Settings**
2. Toggle off **"Enable RLS"** (NOT recommended for production)

**Better solution**: Set up the policies as described above.

## Current Implementation

The code includes:
- Automatic bucket creation (if `SUPABASE_SERVICE_ROLE_KEY` is set)
- Better error messages guiding users to create the bucket manually
- Retry logic after bucket creation
- File naming: `{userId}-{timestamp}.{ext}` (e.g., `abc123-1234567890.jpg`)

