/*
  Warnings:

  - The values [paid,unpaid,partially_paid,deposit_paid] on the enum `QuotationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'partially_paid', 'deposit_paid', 'fully_paid');

-- AlterEnum
BEGIN;
CREATE TYPE "QuotationStatus_new" AS ENUM ('draft', 'in_review', 'accepted', 'rejected');
ALTER TABLE "quotations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quotations" ALTER COLUMN "status" TYPE "QuotationStatus_new" USING ("status"::text::"QuotationStatus_new");
ALTER TYPE "QuotationStatus" RENAME TO "QuotationStatus_old";
ALTER TYPE "QuotationStatus_new" RENAME TO "QuotationStatus";
DROP TYPE "QuotationStatus_old";
ALTER TABLE "quotations" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid';
