-- AlterTable
ALTER TABLE "milestones" ALTER COLUMN "color" SET DEFAULT 'pastel-sky';

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "remarks" TEXT;

-- CreateTable
CREATE TABLE "receipt_services" (
    "id" SERIAL NOT NULL,
    "receiptId" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "descriptionOverride" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipt_services_receiptId_idx" ON "receipt_services"("receiptId");

-- AddForeignKey
ALTER TABLE "receipt_services" ADD CONSTRAINT "receipt_services_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_services" ADD CONSTRAINT "receipt_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
