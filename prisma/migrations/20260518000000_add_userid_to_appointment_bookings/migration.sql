-- 1. Add nullable userId column referencing User.supabase_id
ALTER TABLE "appointment_bookings" ADD COLUMN "userId" TEXT;

-- 2a. Backfill: exact supabase_id match
--     Covers calendar bookings that fell through to `user.id` because email was missing.
UPDATE "appointment_bookings" b
SET "userId" = u."supabase_id"
FROM "user" u
WHERE b."userId" IS NULL
  AND b."bookedBy" = u."supabase_id";

-- 2b. Backfill: case-insensitive email match
--     Covers calendar bookings that stored `user.email` in bookedBy.
--     DISTINCT ON guards against duplicate-email edge cases (earliest user wins).
UPDATE "appointment_bookings" b
SET "userId" = u."supabase_id"
FROM (
  SELECT DISTINCT ON (LOWER(email)) "supabase_id", LOWER(email) AS email_lower
  FROM "user"
  ORDER BY LOWER(email), "created_at" ASC
) u
WHERE b."userId" IS NULL
  AND LOWER(b."bookedBy") = u.email_lower;

-- 2c. Backfill: case-insensitive firstName + ' ' + lastName match
--     Covers multiple-booking-form and weekly-calendar-booking writes.
--     Aggressive mode: on duplicate names, pick the earliest-created user.
UPDATE "appointment_bookings" b
SET "userId" = u."supabase_id"
FROM (
  SELECT DISTINCT ON (LOWER(TRIM(BOTH ' ' FROM "firstName" || ' ' || "lastName")))
    "supabase_id",
    LOWER(TRIM(BOTH ' ' FROM "firstName" || ' ' || "lastName")) AS name_lower
  FROM "user"
  ORDER BY LOWER(TRIM(BOTH ' ' FROM "firstName" || ' ' || "lastName")), "created_at" ASC
) u
WHERE b."userId" IS NULL
  AND LOWER(TRIM(BOTH ' ' FROM b."bookedBy")) = u.name_lower;

-- 3. Supporting index for the new ownership filter
CREATE INDEX "appointment_bookings_userId_idx" ON "appointment_bookings"("userId");

-- 4. Foreign-key constraint to User.supabase_id
ALTER TABLE "appointment_bookings"
  ADD CONSTRAINT "appointment_bookings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("supabase_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
