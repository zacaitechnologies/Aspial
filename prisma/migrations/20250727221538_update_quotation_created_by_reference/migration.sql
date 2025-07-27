-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_createdById_fkey";

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
