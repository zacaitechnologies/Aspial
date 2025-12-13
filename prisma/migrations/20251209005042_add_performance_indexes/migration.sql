/*
  Warnings:

  - Added the required column `createdById` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
image.png-- AlterTable: Add createdById as nullable first
ALTER TABLE "clients" ADD COLUMN     "createdById" TEXT;

-- Set default value for existing rows (use first user's id)
UPDATE "clients" 
SET "createdById" = (SELECT id FROM "user" LIMIT 1)
WHERE "createdById" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "clients" ALTER COLUMN "createdById" SET NOT NULL;

-- CreateIndex
CREATE INDEX "project_permissions_userId_idx" ON "project_permissions"("userId");

-- CreateIndex
CREATE INDEX "project_permissions_projectId_idx" ON "project_permissions"("projectId");

-- CreateIndex
CREATE INDEX "project_permissions_userId_isOwner_idx" ON "project_permissions"("userId", "isOwner");

-- CreateIndex
CREATE INDEX "project_permissions_userId_canView_idx" ON "project_permissions"("userId", "canView");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_createdBy_idx" ON "projects"("createdBy");

-- CreateIndex
CREATE INDEX "user_supabase_id_idx" ON "user"("supabase_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
