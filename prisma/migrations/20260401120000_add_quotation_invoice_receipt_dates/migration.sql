-- Add business document date columns and backfill from legacy created_at.
-- Then set created_at from updated_at so created_at reflects row insert audit (per migration plan).

-- Quotations
ALTER TABLE "quotations" ADD COLUMN "quotation_date" TIMESTAMP(3);

UPDATE "quotations" SET "quotation_date" = "created_at";
UPDATE "quotations" SET "created_at" = "updated_at";

ALTER TABLE "quotations" ALTER COLUMN "quotation_date" SET NOT NULL;
ALTER TABLE "quotations" ALTER COLUMN "quotation_date" SET DEFAULT CURRENT_TIMESTAMP;

-- Invoices
ALTER TABLE "invoices" ADD COLUMN "invoice_date" TIMESTAMP(3);

UPDATE "invoices" SET "invoice_date" = "created_at";
UPDATE "invoices" SET "created_at" = "updated_at";

ALTER TABLE "invoices" ALTER COLUMN "invoice_date" SET NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "invoice_date" SET DEFAULT CURRENT_TIMESTAMP;

-- Receipts
ALTER TABLE "receipts" ADD COLUMN "receipt_date" TIMESTAMP(3);

UPDATE "receipts" SET "receipt_date" = "created_at";
UPDATE "receipts" SET "created_at" = "updated_at";

ALTER TABLE "receipts" ALTER COLUMN "receipt_date" SET NOT NULL;
ALTER TABLE "receipts" ALTER COLUMN "receipt_date" SET DEFAULT CURRENT_TIMESTAMP;
