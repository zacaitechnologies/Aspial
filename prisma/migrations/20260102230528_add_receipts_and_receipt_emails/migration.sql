-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_emails" (
    "id" SERIAL NOT NULL,
    "receiptId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,

    CONSTRAINT "receipt_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "receipts_invoiceId_idx" ON "receipts"("invoiceId");

-- CreateIndex
CREATE INDEX "receipts_created_at_idx" ON "receipts"("created_at");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_emails" ADD CONSTRAINT "receipt_emails_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_emails" ADD CONSTRAINT "receipt_emails_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
