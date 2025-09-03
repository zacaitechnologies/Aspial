/*
  Warnings:

  - Renaming column `assigneeId` to `creatorId` on the `tasks` table. Data will be preserved.

*/
-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigneeId_fkey";

-- Rename column (preserves data)
ALTER TABLE "tasks" RENAME COLUMN "assigneeId" TO "creatorId";

-- AddForeignKey with new column name
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
