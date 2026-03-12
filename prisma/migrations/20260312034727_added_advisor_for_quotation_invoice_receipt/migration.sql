-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "advisedById" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "advisedById" TEXT;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "advisedById" TEXT;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_advisedById_fkey" FOREIGN KEY ("advisedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_advisedById_fkey" FOREIGN KEY ("advisedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_advisedById_fkey" FOREIGN KEY ("advisedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
