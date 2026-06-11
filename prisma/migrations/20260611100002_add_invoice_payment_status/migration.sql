-- Add derived payment status to invoices
ALTER TABLE "invoices" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid';

CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- Backfill from active receipts (invoices with no receipts keep the 'unpaid' default)
UPDATE "invoices" i
SET "paymentStatus" = CASE
    WHEN COALESCE(r.received, 0) <= 0 THEN 'unpaid'::"PaymentStatus"
    WHEN COALESCE(r.received, 0) >= i."amount" THEN 'fully_paid'::"PaymentStatus"
    ELSE 'partially_paid'::"PaymentStatus"
END
FROM (
    SELECT "invoiceId", SUM("amount") AS received
    FROM "receipts"
    WHERE "status" = 'active' AND "invoiceId" IS NOT NULL
    GROUP BY "invoiceId"
) r
WHERE r."invoiceId" = i."id";
