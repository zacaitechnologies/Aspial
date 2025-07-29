-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DOUBLE PRECISION;
