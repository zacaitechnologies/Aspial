/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "quotation_emails" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,

    CONSTRAINT "quotation_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_name_key" ON "quotations"("name");

-- AddForeignKey
ALTER TABLE "quotation_emails" ADD CONSTRAINT "quotation_emails_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_emails" ADD CONSTRAINT "quotation_emails_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
