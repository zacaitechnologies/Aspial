-- Migration: add requiresAttachment column to leave_type
-- Lets admins flag specific leave types (e.g. MEDICAL) as needing a
-- supporting document (MC, image, PDF) at application time.

ALTER TABLE "leave_type"
  ADD COLUMN "requiresAttachment" BOOLEAN NOT NULL DEFAULT FALSE;
