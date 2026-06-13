-- Task completion timestamp
ALTER TABLE "tasks" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Milestone start date + completion timestamp
ALTER TABLE "milestones" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "milestones" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Existing milestones: creation date becomes the start date
UPDATE "milestones" SET "startDate" = "createdAt" WHERE "startDate" IS NULL;

-- Now that every row has a value, enforce NOT NULL (mirrors tasks.startDate)
ALTER TABLE "milestones" ALTER COLUMN "startDate" SET NOT NULL;

-- Best-effort backfill of completion time for items already finished
UPDATE "tasks" SET "completedAt" = "updatedAt" WHERE "status" = 'done' AND "completedAt" IS NULL;
UPDATE "milestones" SET "completedAt" = "updatedAt" WHERE "status" = 'completed' AND "completedAt" IS NULL;
