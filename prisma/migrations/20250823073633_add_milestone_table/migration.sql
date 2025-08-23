/*
  Warnings:

  - You are about to drop the column `type` on the `tasks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "type",
ADD COLUMN     "milestoneId" INTEGER;

-- DropEnum
DROP TYPE "TaskType";

-- CreateTable
CREATE TABLE "milestones" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'low',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'in_progress',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
