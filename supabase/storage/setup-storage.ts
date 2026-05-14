/**
 * Idempotent Supabase Storage setup.
 *
 * - Creates buckets only if they do not already exist (never overwrites).
 * - Returns the matching RLS policy SQL for each bucket so it can be applied
 *   in the Supabase SQL Editor.
 *
 * Used by `scripts/setup-storage.ts`. Not imported by Next.js application code,
 * so no "use server" directive is needed here.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

export type BucketKey =
  | "profile-pictures"
  | "service"
  | "contracts"
  | "leave-attachments"

export const BUCKET_KEYS: readonly BucketKey[] = [
  "profile-pictures",
  "service",
  "contracts",
  "leave-attachments",
] as const

interface BucketConfig {
  key: BucketKey
  /** Public bucket = objects accessible via /object/public/... URLs. Private = signed URLs only. */
  public: boolean
  fileSizeLimit: number
  /** Empty array = no MIME restriction (matches current dashboard config). */
  allowedMimeTypes: string[]
  description: string
}

const FIVE_MB = 5 * 1024 * 1024
const TEN_MB = 10 * 1024 * 1024

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const IMAGE_AND_PDF_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]

const BUCKET_CONFIGS: Record<BucketKey, BucketConfig> = {
  "profile-pictures": {
    key: "profile-pictures",
    public: true,
    fileSizeLimit: FIVE_MB,
    allowedMimeTypes: IMAGE_MIMES,
    description: "User profile photos (publicly viewable).",
  },
  service: {
    key: "service",
    public: false,
    fileSizeLimit: FIVE_MB,
    allowedMimeTypes: IMAGE_AND_PDF_MIMES,
    description: "Service catalog images and PDFs (signed URLs).",
  },
  contracts: {
    key: "contracts",
    public: false,
    fileSizeLimit: TEN_MB,
    allowedMimeTypes: [],
    description: "Project contracts (signed URLs).",
  },
  "leave-attachments": {
    key: "leave-attachments",
    public: true,
    fileSizeLimit: FIVE_MB,
    allowedMimeTypes: IMAGE_AND_PDF_MIMES,
    description: "Leave application supporting documents.",
  },
}

/**
 * Policy names mirror the existing dashboard policies so re-running the SQL
 * does not orphan policies under different names. Each bucket uses unique
 * policy names so DROP POLICY IF EXISTS does not affect other buckets.
 */
const RLS_SQL: Record<BucketKey, string> = {
  "profile-pictures": `-- profile-pictures (public bucket)
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');`,

  service: `-- service (private bucket — authenticated users only)
DROP POLICY IF EXISTS "Authenticated users can upload service files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view service files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update service files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service files" ON storage.objects;

CREATE POLICY "Authenticated users can upload service files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service');

CREATE POLICY "Authenticated users can view service files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'service');

CREATE POLICY "Authenticated users can update service files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service')
WITH CHECK (bucket_id = 'service');

CREATE POLICY "Authenticated users can delete service files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service');`,

  contracts: `-- contracts (private bucket — authenticated users only)
DROP POLICY IF EXISTS "Users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON storage.objects;

CREATE POLICY "Users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Anyone can view contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can update contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contracts');`,

  "leave-attachments": `-- leave-attachments (public bucket)
DROP POLICY IF EXISTS "Allow authenticated leave uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public leave reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated leave updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated leave deletes" ON storage.objects;

CREATE POLICY "Allow authenticated leave uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leave-attachments');

CREATE POLICY "Allow public leave reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leave-attachments');

CREATE POLICY "Allow authenticated leave updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leave-attachments')
WITH CHECK (bucket_id = 'leave-attachments');

CREATE POLICY "Allow authenticated leave deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leave-attachments');`,
}

export interface SetupResult {
  success: boolean
  bucket: BucketKey
  alreadyExisted: boolean
  bucketCreated: boolean
  message: string
  sql: string
  error?: string
}

function createAdminClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables")
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables")
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

async function setupBucket(key: BucketKey): Promise<SetupResult> {
  const config = BUCKET_CONFIGS[key]
  const sql = RLS_SQL[key]

  try {
    const adminClient = createAdminClient()

    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const alreadyExisted = Boolean(buckets?.some((b) => b.name === key))

    if (alreadyExisted) {
      return {
        success: true,
        bucket: key,
        alreadyExisted: true,
        bucketCreated: false,
        message: `Bucket '${key}' already exists — left untouched. RLS policy SQL below is safe to re-run if needed.`,
        sql,
      }
    }

    const { error: createError } = await adminClient.storage.createBucket(key, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes.length > 0
        ? config.allowedMimeTypes
        : undefined,
    })

    if (createError) {
      throw new Error(`Failed to create bucket '${key}': ${createError.message}`)
    }

    return {
      success: true,
      bucket: key,
      alreadyExisted: false,
      bucketCreated: true,
      message: `Bucket '${key}' created. Apply the RLS policy SQL below in the Supabase SQL Editor.`,
      sql,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      success: false,
      bucket: key,
      alreadyExisted: false,
      bucketCreated: false,
      message: `Setup failed for '${key}': ${message}`,
      sql,
      error: message,
    }
  }
}

export const setupProfilePicturesStorage = (): Promise<SetupResult> =>
  setupBucket("profile-pictures")

export const setupServiceStorage = (): Promise<SetupResult> =>
  setupBucket("service")

export const setupContractsStorage = (): Promise<SetupResult> =>
  setupBucket("contracts")

export const setupLeaveAttachmentsStorage = (): Promise<SetupResult> =>
  setupBucket("leave-attachments")

/** Runs all bucket setups sequentially. Order is stable so output is predictable. */
export async function setupAllStorage(): Promise<SetupResult[]> {
  const results: SetupResult[] = []
  for (const key of BUCKET_KEYS) {
    results.push(await setupBucket(key))
  }
  return results
}

export function getBucketRlsSql(key: BucketKey): string {
  return RLS_SQL[key]
}
