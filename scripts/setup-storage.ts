/**
 * Setup script for Supabase Storage buckets.
 *
 * Each bucket is created only if it does not already exist. Existing buckets
 * are left untouched. The script prints the RLS policy SQL you need to paste
 * into the Supabase SQL Editor.
 *
 * Required env vars (loaded by tsx from `.env` if you use `tsx --env-file=.env`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   # All buckets (default)
 *   npm run setup:storage
 *
 *   # A single bucket
 *   npm run setup:storage -- service
 *   npm run setup:storage -- contracts
 *   npm run setup:storage -- profile-pictures
 *   npm run setup:storage -- leave-attachments
 *
 *   # Multiple buckets in one go
 *   npm run setup:storage -- service contracts
 *
 *   # Or call tsx directly
 *   npx tsx --env-file=.env scripts/setup-storage.ts service
 */

import {
  BUCKET_KEYS,
  setupContractsStorage,
  setupLeaveAttachmentsStorage,
  setupProfilePicturesStorage,
  setupServiceStorage,
  type BucketKey,
  type SetupResult,
} from "../supabase/storage/setup-storage"

const HANDLERS: Record<BucketKey, () => Promise<SetupResult>> = {
  "profile-pictures": setupProfilePicturesStorage,
  service: setupServiceStorage,
  contracts: setupContractsStorage,
  "leave-attachments": setupLeaveAttachmentsStorage,
}

function isBucketKey(value: string): value is BucketKey {
  return (BUCKET_KEYS as readonly string[]).includes(value)
}

function printResult(result: SetupResult) {
  console.log("")
  console.log(`── ${result.bucket} ──`)

  if (!result.success) {
    console.log(`❌ ${result.message}`)
  } else if (result.alreadyExisted) {
    console.log(`ℹ️  ${result.message}`)
  } else {
    console.log(`✅ ${result.message}`)
  }

  console.log("")
  console.log("RLS policy SQL (run in Supabase SQL Editor — idempotent):")
  console.log("")
  console.log(result.sql)
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg.trim().length > 0)

  let targets: BucketKey[]
  if (args.length === 0) {
    targets = [...BUCKET_KEYS]
    console.log(`🚀 Setting up all storage buckets: ${targets.join(", ")}`)
  } else {
    const invalid = args.filter((arg) => !isBucketKey(arg))
    if (invalid.length > 0) {
      console.error(
        `Unknown bucket name(s): ${invalid.join(", ")}\n` +
          `Valid options: ${BUCKET_KEYS.join(", ")}`
      )
      process.exit(2)
    }
    targets = args as BucketKey[]
    console.log(`🚀 Setting up storage buckets: ${targets.join(", ")}`)
  }

  const results: SetupResult[] = []
  for (const key of targets) {
    results.push(await HANDLERS[key]())
  }

  results.forEach(printResult)

  console.log("")
  const created = results.filter((r) => r.success && r.bucketCreated).length
  const existed = results.filter((r) => r.success && r.alreadyExisted).length
  const failed = results.filter((r) => !r.success).length
  console.log(`Summary: ${created} created, ${existed} already existed, ${failed} failed.`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error"
  console.error("Fatal error:", message)
  process.exit(1)
})
