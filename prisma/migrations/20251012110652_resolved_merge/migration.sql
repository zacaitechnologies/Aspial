/*
  Warnings:

  - You are about to drop the column `approvedById` on the `custom_services` table. All the data in the column will be lost.
  - The `status` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `status` on the `quotations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'final';

-- DropForeignKey
ALTER TABLE "custom_services" DROP CONSTRAINT "custom_services_approvedById_fkey";

-- AlterTable
ALTER TABLE "custom_services" DROP COLUMN "approvedById",
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "status",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'planning';

-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "status",
ADD COLUMN     "workflowStatus" "QuotationStatus" NOT NULL DEFAULT 'draft';

-- AddForeignKey
ALTER TABLE "custom_services" ADD CONSTRAINT "custom_services_approvedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;
