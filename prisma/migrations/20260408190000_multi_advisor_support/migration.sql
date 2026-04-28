-- CreateTable
CREATE TABLE "client_advisors" (
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "client_advisors_pkey" PRIMARY KEY ("clientId","userId")
);

-- CreateTable
CREATE TABLE "quotation_advisors" (
    "quotationId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "quotation_advisors_pkey" PRIMARY KEY ("quotationId","userId")
);

-- CreateTable
CREATE TABLE "invoice_advisors" (
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "invoice_advisors_pkey" PRIMARY KEY ("invoiceId","userId")
);

-- CreateTable
CREATE TABLE "receipt_advisors" (
    "receiptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "receipt_advisors_pkey" PRIMARY KEY ("receiptId","userId")
);

-- AddForeignKey
ALTER TABLE "client_advisors" ADD CONSTRAINT "client_advisors_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_advisors" ADD CONSTRAINT "client_advisors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_advisors" ADD CONSTRAINT "quotation_advisors_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_advisors" ADD CONSTRAINT "quotation_advisors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_advisors" ADD CONSTRAINT "invoice_advisors_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_advisors" ADD CONSTRAINT "invoice_advisors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_advisors" ADD CONSTRAINT "receipt_advisors_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_advisors" ADD CONSTRAINT "receipt_advisors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: client creators become advisors
INSERT INTO "client_advisors" ("clientId", "userId")
SELECT id, "createdById" FROM "clients" WHERE "createdById" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing quotation advisors
INSERT INTO "quotation_advisors" ("quotationId", "userId")
SELECT id, "advisedById" FROM "quotations" WHERE "advisedById" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing invoice advisors
INSERT INTO "invoice_advisors" ("invoiceId", "userId")
SELECT id, "advisedById" FROM "invoices" WHERE "advisedById" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing receipt advisors
INSERT INTO "receipt_advisors" ("receiptId", "userId")
SELECT id, "advisedById" FROM "receipts" WHERE "advisedById" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old advisedById foreign keys
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_advisedById_fkey";
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_advisedById_fkey";
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_advisedById_fkey";

-- Drop old advisedById columns
ALTER TABLE "quotations" DROP COLUMN "advisedById";
ALTER TABLE "invoices" DROP COLUMN "advisedById";
ALTER TABLE "receipts" DROP COLUMN "advisedById";
