/*
  Warnings:

  - You are about to drop the column `status` on the `complaints` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_projectId_fkey";

-- AlterTable
ALTER TABLE "complaints" DROP COLUMN "status",
ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "profilePicture" TEXT;

-- DropEnum
DROP TYPE "ComplaintStatus";

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
