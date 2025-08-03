-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_quotationId_fkey";

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
