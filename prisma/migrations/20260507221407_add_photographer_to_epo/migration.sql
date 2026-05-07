-- CreateTable
CREATE TABLE "invoice_photographers" (
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "invoice_photographers_pkey" PRIMARY KEY ("invoiceId","userId")
);

-- AddForeignKey
ALTER TABLE "invoice_photographers" ADD CONSTRAINT "invoice_photographers_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_photographers" ADD CONSTRAINT "invoice_photographers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
