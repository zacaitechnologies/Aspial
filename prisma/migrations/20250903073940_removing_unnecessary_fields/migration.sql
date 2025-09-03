/*
  Warnings:

  - You are about to drop the column `priority` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `tasks` table. All the data in the column will be lost.
  - Made the column `dueDate` on table `milestones` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startDate` on table `projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endDate` on table `projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdBy` on table `projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientId` on table `projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientName` on table `projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `duration` on table `quotations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endDate` on table `quotations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startDate` on table `quotations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientId` on table `quotations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `assigneeId` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dueDate` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startDate` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_clientId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_clientId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigneeId_fkey";

-- AlterTable
ALTER TABLE "milestones" ALTER COLUMN "dueDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "priority",
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL,
ALTER COLUMN "createdBy" SET NOT NULL,
ALTER COLUMN "clientId" SET NOT NULL,
ALTER COLUMN "clientName" SET NOT NULL;

-- AlterTable
ALTER TABLE "quotations" ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "endDate" SET NOT NULL,
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "clientId" SET NOT NULL;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "tags",
ALTER COLUMN "assigneeId" SET NOT NULL,
ALTER COLUMN "dueDate" SET NOT NULL,
ALTER COLUMN "startDate" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
