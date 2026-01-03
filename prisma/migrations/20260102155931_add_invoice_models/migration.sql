-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SO', 'EPO', 'EO');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_emails" (
    "id" SERIAL NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,

    CONSTRAINT "invoice_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_quotationId_idx" ON "invoices"("quotationId");

-- CreateIndex
CREATE INDEX "invoices_type_idx" ON "invoices"("type");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_emails" ADD CONSTRAINT "invoice_emails_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_emails" ADD CONSTRAINT "invoice_emails_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
