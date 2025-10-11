-- CreateEnum
CREATE TYPE "CustomServiceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "custom_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "CustomServiceStatus" NOT NULL DEFAULT 'PENDING',
    "approvalComment" TEXT,
    "rejectionComment" TEXT,
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_services_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "quotation_services" ADD COLUMN "customServiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quotation_services_quotationId_customServiceId_key" ON "quotation_services"("quotationId", "customServiceId");

-- AddForeignKey
ALTER TABLE "custom_services" ADD CONSTRAINT "custom_services_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_services" ADD CONSTRAINT "custom_services_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_services" ADD CONSTRAINT "custom_services_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_services" ADD CONSTRAINT "quotation_services_customServiceId_fkey" FOREIGN KEY ("customServiceId") REFERENCES "custom_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
