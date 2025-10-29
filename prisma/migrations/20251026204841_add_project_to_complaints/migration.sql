/*
  Warnings:

  - Added the required column `projectId` to the `complaints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "projectId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
