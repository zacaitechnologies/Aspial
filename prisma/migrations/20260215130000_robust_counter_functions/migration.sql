-- ============================================================================
-- Robust, self-healing counter functions for invoices, receipts, quotations.
--
-- Each function:
--   1. Atomically increments the counter via INSERT ... ON CONFLICT ... UPDATE.
--   2. After generating a candidate number, checks the real table for conflicts.
--   3. If a conflict is found (counter was stale / deleted / tampered with),
--      it recalculates the counter from MAX(existing records) and retries.
--   4. Guarantees a unique, monotonically increasing number or raises an error.
-- ============================================================================

-- ===== INVOICE =====
CREATE OR REPLACE FUNCTION generate_gapless_invoice_number(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next       INTEGER;
    v_candidate  TEXT;
    v_actual_max INTEGER;
    v_prefix     TEXT;
    v_pad        INTEGER;
    v_attempt    INTEGER := 0;
    v_max_attempts CONSTANT INTEGER := 5;
BEGIN
    -- Resolve prefix and padding by type
    IF p_type = 'SO' THEN
        v_prefix := 'SO-';
        v_pad := 5;
    ELSIF p_type = 'EPO' THEN
        v_prefix := 'EPO-N';
        v_pad := 4;
    ELSIF p_type = 'EO' THEN
        v_prefix := 'EO-N';
        v_pad := 4;
    ELSE
        RAISE EXCEPTION 'Unknown invoice type: %', p_type;
    END IF;

    LOOP
        v_attempt := v_attempt + 1;
        IF v_attempt > v_max_attempts THEN
            RAISE EXCEPTION 'generate_gapless_invoice_number: exceeded % attempts for type %', v_max_attempts, p_type;
        END IF;

        -- Atomically increment (or create) the counter row
        INSERT INTO "invoice_counters" ("type", "last_value")
        VALUES (p_type, 1)
        ON CONFLICT ("type")
        DO UPDATE SET "last_value" = "invoice_counters"."last_value" + 1
        RETURNING "last_value" INTO v_next;

        v_candidate := v_prefix || LPAD(v_next::TEXT, v_pad, '0');

        -- Check if this number already exists in the invoices table
        IF NOT EXISTS (SELECT 1 FROM "invoices" WHERE "invoiceNumber" = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        -- Conflict detected: counter was stale. Repair it from actual data.
        SELECT COALESCE(MAX(
            CAST(REPLACE("invoiceNumber", v_prefix, '') AS INTEGER)
        ), 0)
        INTO v_actual_max
        FROM "invoices"
        WHERE "type" = p_type;

        UPDATE "invoice_counters"
        SET "last_value" = v_actual_max
        WHERE "type" = p_type;

        -- Loop will re-increment from the corrected value
    END LOOP;
END;
$$;


-- ===== RECEIPT =====
CREATE OR REPLACE FUNCTION generate_gapless_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next       INTEGER;
    v_candidate  TEXT;
    v_actual_max INTEGER;
    v_attempt    INTEGER := 0;
    v_max_attempts CONSTANT INTEGER := 5;
BEGIN
    LOOP
        v_attempt := v_attempt + 1;
        IF v_attempt > v_max_attempts THEN
            RAISE EXCEPTION 'generate_gapless_receipt_number: exceeded % attempts', v_max_attempts;
        END IF;

        -- Atomically increment (or create) the counter row
        INSERT INTO "receipt_counters" ("id", "last_value")
        VALUES ('singleton', 1)
        ON CONFLICT ("id")
        DO UPDATE SET "last_value" = "receipt_counters"."last_value" + 1
        RETURNING "last_value" INTO v_next;

        v_candidate := 'OR-N' || LPAD(v_next::TEXT, 4, '0');

        -- Check if this number already exists in the receipts table
        IF NOT EXISTS (SELECT 1 FROM "receipts" WHERE "receiptNumber" = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        -- Conflict detected: counter was stale. Repair it from actual data.
        SELECT COALESCE(MAX(
            CAST(REPLACE("receiptNumber", 'OR-N', '') AS INTEGER)
        ), 0)
        INTO v_actual_max
        FROM "receipts";

        UPDATE "receipt_counters"
        SET "last_value" = v_actual_max
        WHERE "id" = 'singleton';

        -- Loop will re-increment from the corrected value
    END LOOP;
END;
$$;


-- ===== QUOTATION =====
CREATE OR REPLACE FUNCTION generate_gapless_quotation_name()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_month      TEXT;
    v_next       INTEGER;
    v_candidate  TEXT;
    v_actual_max INTEGER;
    v_attempt    INTEGER := 0;
    v_max_attempts CONSTANT INTEGER := 5;
BEGIN
    v_month := to_char(CURRENT_DATE, 'YYYYMM');

    LOOP
        v_attempt := v_attempt + 1;
        IF v_attempt > v_max_attempts THEN
            RAISE EXCEPTION 'generate_gapless_quotation_name: exceeded % attempts for month %', v_max_attempts, v_month;
        END IF;

        -- Atomically increment (or create) the counter row for this month
        INSERT INTO "quotation_counters" ("month_prefix", "last_value")
        VALUES (v_month, 1)
        ON CONFLICT ("month_prefix")
        DO UPDATE SET "last_value" = "quotation_counters"."last_value" + 1
        RETURNING "last_value" INTO v_next;

        v_candidate := 'QUO-' || v_month || LPAD(v_next::TEXT, 3, '0');

        -- Check if this number already exists in the quotations table
        IF NOT EXISTS (SELECT 1 FROM "quotations" WHERE "name" = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        -- Conflict detected: counter was stale. Repair it from actual data.
        -- Extract the numeric suffix from quotation names matching this month
        SELECT COALESCE(MAX(
            CAST(SUBSTRING("name" FROM LENGTH('QUO-' || v_month) + 1) AS INTEGER)
        ), 0)
        INTO v_actual_max
        FROM "quotations"
        WHERE "name" LIKE 'QUO-' || v_month || '%';

        UPDATE "quotation_counters"
        SET "last_value" = v_actual_max
        WHERE "month_prefix" = v_month;

        -- Loop will re-increment from the corrected value
    END LOOP;
END;
$$;
