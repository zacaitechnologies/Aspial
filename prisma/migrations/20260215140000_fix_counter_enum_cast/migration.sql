-- Fix invoice counter function: cast p_type to "InvoiceType" enum for WHERE clause

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

        INSERT INTO "invoice_counters" ("type", "last_value")
        VALUES (p_type, 1)
        ON CONFLICT ("type")
        DO UPDATE SET "last_value" = "invoice_counters"."last_value" + 1
        RETURNING "last_value" INTO v_next;

        v_candidate := v_prefix || LPAD(v_next::TEXT, v_pad, '0');

        IF NOT EXISTS (SELECT 1 FROM "invoices" WHERE "invoiceNumber" = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        -- Counter was stale. Repair from actual invoice data (cast text to enum).
        SELECT COALESCE(MAX(
            CAST(REPLACE("invoiceNumber", v_prefix, '') AS INTEGER)
        ), 0)
        INTO v_actual_max
        FROM "invoices"
        WHERE "type" = p_type::"InvoiceType";

        UPDATE "invoice_counters"
        SET "last_value" = v_actual_max
        WHERE "type" = p_type;
    END LOOP;
END;
$$;
