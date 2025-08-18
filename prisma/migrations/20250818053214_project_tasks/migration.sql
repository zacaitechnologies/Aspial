-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('task', 'milestone');

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'backlog',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "TaskType" NOT NULL DEFAULT 'task',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;
