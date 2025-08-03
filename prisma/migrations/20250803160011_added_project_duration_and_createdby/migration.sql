-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "duration" INTEGER;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;
