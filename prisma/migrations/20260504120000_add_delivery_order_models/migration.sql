-- ============================================================================
-- Delivery Order module
-- Tables: delivery_orders, delivery_order_services, delivery_order_advisors,
--         delivery_order_photographers, delivery_order_emails,
--         delivery_order_counters
-- Enum:   DeliveryOrderStatus
-- Function: generate_gapless_delivery_order_number()  (DO-YYYYMM###, monthly reset)
-- ============================================================================

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('active', 'cancelled');

-- CreateTable: delivery_orders
CREATE TABLE "delivery_orders" (
    "id" TEXT NOT NULL,
    "deliveryOrderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "notes" TEXT,
    "discountType" "DiscountType",
    "discountValue" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'active',
    "delivery_order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_orders_deliveryOrderNumber_key" ON "delivery_orders"("deliveryOrderNumber");
CREATE INDEX "delivery_orders_clientId_idx" ON "delivery_orders"("clientId");
CREATE INDEX "delivery_orders_created_at_idx" ON "delivery_orders"("created_at");
CREATE INDEX "delivery_orders_status_idx" ON "delivery_orders"("status");

-- CreateTable: delivery_order_services
CREATE TABLE "delivery_order_services" (
    "id" SERIAL NOT NULL,
    "deliveryOrderId" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "descriptionOverride" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_order_services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_order_services_deliveryOrderId_idx" ON "delivery_order_services"("deliveryOrderId");

-- CreateTable: delivery_order_advisors
CREATE TABLE "delivery_order_advisors" (
    "deliveryOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "delivery_order_advisors_pkey" PRIMARY KEY ("deliveryOrderId","userId")
);

-- CreateTable: delivery_order_photographers
CREATE TABLE "delivery_order_photographers" (
    "deliveryOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "delivery_order_photographers_pkey" PRIMARY KEY ("deliveryOrderId","userId")
);

-- CreateTable: delivery_order_emails
CREATE TABLE "delivery_order_emails" (
    "id" SERIAL NOT NULL,
    "deliveryOrderId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,

    CONSTRAINT "delivery_order_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable: delivery_order_counters
CREATE TABLE "delivery_order_counters" (
    "month_prefix" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_order_counters_pkey" PRIMARY KEY ("month_prefix")
);

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_order_services" ADD CONSTRAINT "delivery_order_services_deliveryOrderId_fkey"
    FOREIGN KEY ("deliveryOrderId") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_services" ADD CONSTRAINT "delivery_order_services_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_order_advisors" ADD CONSTRAINT "delivery_order_advisors_deliveryOrderId_fkey"
    FOREIGN KEY ("deliveryOrderId") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_advisors" ADD CONSTRAINT "delivery_order_advisors_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_photographers" ADD CONSTRAINT "delivery_order_photographers_deliveryOrderId_fkey"
    FOREIGN KEY ("deliveryOrderId") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_photographers" ADD CONSTRAINT "delivery_order_photographers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_emails" ADD CONSTRAINT "delivery_order_emails_deliveryOrderId_fkey"
    FOREIGN KEY ("deliveryOrderId") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_order_emails" ADD CONSTRAINT "delivery_order_emails_sentById_fkey"
    FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Gapless / self-healing delivery order number generator.
-- Format: DO-YYYYMM### (3-digit suffix, resets each month).
-- Mirrors generate_gapless_quotation_name() with table/prefix substitutions.
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_gapless_delivery_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_month        TEXT;
    v_next         INTEGER;
    v_candidate    TEXT;
    v_actual_max   INTEGER;
    v_attempt      INTEGER := 0;
    v_max_attempts CONSTANT INTEGER := 5;
BEGIN
    v_month := to_char(CURRENT_DATE, 'YYYYMM');

    LOOP
        v_attempt := v_attempt + 1;
        IF v_attempt > v_max_attempts THEN
            RAISE EXCEPTION 'generate_gapless_delivery_order_number: exceeded % attempts for month %', v_max_attempts, v_month;
        END IF;

        INSERT INTO "delivery_order_counters" ("month_prefix", "last_value")
        VALUES (v_month, 1)
        ON CONFLICT ("month_prefix")
        DO UPDATE SET "last_value" = "delivery_order_counters"."last_value" + 1
        RETURNING "last_value" INTO v_next;

        v_candidate := 'DO-' || v_month || LPAD(v_next::TEXT, 3, '0');

        IF NOT EXISTS (
            SELECT 1 FROM "delivery_orders" WHERE "deliveryOrderNumber" = v_candidate
        ) THEN
            RETURN v_candidate;
        END IF;

        SELECT COALESCE(MAX(
            CAST(SUBSTRING("deliveryOrderNumber" FROM LENGTH('DO-' || v_month) + 1) AS INTEGER)
        ), 0)
        INTO v_actual_max
        FROM "delivery_orders"
        WHERE "deliveryOrderNumber" LIKE 'DO-' || v_month || '%';

        UPDATE "delivery_order_counters"
           SET "last_value" = v_actual_max
         WHERE "month_prefix" = v_month;
    END LOOP;
END;
$$;
