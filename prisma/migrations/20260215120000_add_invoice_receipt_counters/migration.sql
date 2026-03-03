-- CreateTable
CREATE TABLE "invoice_counters" (
    "type" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "receipt_counters" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("id")
);

-- Seed invoice counters from existing data so the sequence continues correctly
INSERT INTO "invoice_counters" ("type", "last_value")
SELECT 'SO', COALESCE(MAX(
    CAST(REPLACE("invoiceNumber", 'SO-', '') AS INTEGER)
), 0)
FROM "invoices" WHERE "type" = 'SO'
ON CONFLICT ("type") DO NOTHING;

INSERT INTO "invoice_counters" ("type", "last_value")
SELECT 'EPO', COALESCE(MAX(
    CAST(REPLACE("invoiceNumber", 'EPO-N', '') AS INTEGER)
), 0)
FROM "invoices" WHERE "type" = 'EPO'
ON CONFLICT ("type") DO NOTHING;

INSERT INTO "invoice_counters" ("type", "last_value")
SELECT 'EO', COALESCE(MAX(
    CAST(REPLACE("invoiceNumber", 'EO-N', '') AS INTEGER)
), 0)
FROM "invoices" WHERE "type" = 'EO'
ON CONFLICT ("type") DO NOTHING;

-- Seed receipt counter from existing data
INSERT INTO "receipt_counters" ("id", "last_value")
SELECT 'singleton', COALESCE(MAX(
    CAST(REPLACE("receiptNumber", 'OR-N', '') AS INTEGER)
), 0)
FROM "receipts"
ON CONFLICT ("id") DO NOTHING;

-- Create atomic function: generate_gapless_invoice_number(invoice_type TEXT)
-- Returns formatted invoice number, incrementing counter per type.
-- Safe under concurrency via INSERT ... ON CONFLICT ... UPDATE with RETURNING.
CREATE OR REPLACE FUNCTION generate_gapless_invoice_number(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    INSERT INTO "invoice_counters" ("type", "last_value")
    VALUES (p_type, 1)
    ON CONFLICT ("type")
    DO UPDATE SET "last_value" = "invoice_counters"."last_value" + 1
    RETURNING "last_value" INTO v_next;

    IF p_type = 'SO' THEN
        RETURN 'SO-' || LPAD(v_next::TEXT, 5, '0');
    ELSIF p_type = 'EPO' THEN
        RETURN 'EPO-N' || LPAD(v_next::TEXT, 4, '0');
    ELSIF p_type = 'EO' THEN
        RETURN 'EO-N' || LPAD(v_next::TEXT, 4, '0');
    ELSE
        RAISE EXCEPTION 'Unknown invoice type: %', p_type;
    END IF;
END;
$$;

-- Create atomic function: generate_gapless_receipt_number()
-- Returns formatted receipt number, incrementing the global counter.
CREATE OR REPLACE FUNCTION generate_gapless_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    INSERT INTO "receipt_counters" ("id", "last_value")
    VALUES ('singleton', 1)
    ON CONFLICT ("id")
    DO UPDATE SET "last_value" = "receipt_counters"."last_value" + 1
    RETURNING "last_value" INTO v_next;

    RETURN 'OR-N' || LPAD(v_next::TEXT, 4, '0');
END;
$$;
