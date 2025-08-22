/*
  Warnings:

  - You are about to drop the column `quotationId` on the `projects` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_quotationId_fkey";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "quotationId";

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "projectId" INTEGER;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
