/*
  Warnings:

  - The values [sent] on the enum `QuotationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('MEMBER', 'NON_MEMBER');

-- AlterEnum
BEGIN;
CREATE TYPE "QuotationStatus_new" AS ENUM ('draft', 'accepted', 'rejected', 'paid', 'unpaid', 'partially_paid', 'deposit_paid');
ALTER TABLE "quotations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quotations" ALTER COLUMN "status" TYPE "QuotationStatus_new" USING ("status"::text::"QuotationStatus_new");
ALTER TYPE "QuotationStatus" RENAME TO "QuotationStatus_old";
ALTER TYPE "QuotationStatus_new" RENAME TO "QuotationStatus";
DROP TYPE "QuotationStatus_old";
ALTER TABLE "quotations" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "membershipType" "MembershipType" NOT NULL DEFAULT 'NON_MEMBER',
ADD COLUMN     "yearlyRevenue" DOUBLE PRECISION;
