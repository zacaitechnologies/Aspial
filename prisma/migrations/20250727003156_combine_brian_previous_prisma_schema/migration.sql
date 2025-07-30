-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "quotations" 
ADD COLUMN "createdById" TEXT;

-- Drop the default constraint first
ALTER TABLE "quotations" ALTER COLUMN "status" DROP DEFAULT;

-- Update existing status values to match enum
UPDATE "quotations" SET "status" = 'draft' WHERE "status" NOT IN ('draft', 'sent', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "quotations" 
ALTER COLUMN "status" TYPE "QuotationStatus" USING status::"QuotationStatus";

-- Set the new default after type conversion
ALTER TABLE "quotations" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
