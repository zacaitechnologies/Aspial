-- Migration: dynamic LeaveType table + optional Receipt.invoiceId/clientId
-- Strategy:
--   1. Create leave_type table and seed 6 default rows.
--   2. Convert each enum-typed column to TEXT, backfilling PAID -> ANNUAL and UNPAID -> UNPAID.
--   3. Add foreign-key constraints from those TEXT columns to leave_type(code).
--   4. Drop the legacy LeaveType enum and the leave_entitlement_default table.
--   5. Receipt: invoiceId becomes nullable; new clientId column with FK to clients(id).
--      A CHECK constraint ensures at least one of invoiceId / clientId is set.

-- ---------------------------------------------------------------------------
-- 1. New leave_type table + seed
-- ---------------------------------------------------------------------------
CREATE TABLE "leave_type" (
  "id"                       SERIAL       PRIMARY KEY,
  "code"                     TEXT         NOT NULL,
  "name"                     TEXT         NOT NULL,
  "defaultEntitlement"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isDeletable"              BOOLEAN      NOT NULL DEFAULT TRUE,
  "isUnpaid"                 BOOLEAN      NOT NULL DEFAULT FALSE,
  "requiresReplacementDate"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "sortOrder"                INTEGER      NOT NULL DEFAULT 0,
  "isActive"                 BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "leave_type_code_key" ON "leave_type" ("code");

INSERT INTO "leave_type" ("code", "name", "defaultEntitlement", "isDeletable", "isUnpaid", "requiresReplacementDate", "sortOrder")
VALUES
  ('ANNUAL',      'Annual Leave',      14, FALSE, FALSE, FALSE, 10),
  ('MEDICAL',     'Medical Leave',     14, TRUE,  FALSE, FALSE, 20),
  ('MATERNITY',   'Maternity Leave',   98, TRUE,  FALSE, FALSE, 30),
  ('PATERNITY',   'Paternity Leave',    7, TRUE,  FALSE, FALSE, 40),
  ('REPLACEMENT', 'Replacement Leave',  0, TRUE,  FALSE, TRUE,  50),
  ('UNPAID',      'Unpaid Leave',       0, FALSE, TRUE,  FALSE, 60)
ON CONFLICT ("code") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. leave_application: enum -> text via shadow column, backfill, swap
-- ---------------------------------------------------------------------------
ALTER TABLE "leave_application" ADD COLUMN "leaveType_new" TEXT;
UPDATE "leave_application"
SET "leaveType_new" = CASE
  WHEN "leaveType"::text = 'UNPAID' THEN 'UNPAID'
  ELSE 'ANNUAL'
END;
ALTER TABLE "leave_application" DROP COLUMN "leaveType";
ALTER TABLE "leave_application" RENAME COLUMN "leaveType_new" TO "leaveType";
ALTER TABLE "leave_application" ALTER COLUMN "leaveType" SET NOT NULL;

CREATE INDEX "leave_application_leaveType_idx" ON "leave_application" ("leaveType");

ALTER TABLE "leave_application"
  ADD CONSTRAINT "leave_application_leaveType_fkey"
  FOREIGN KEY ("leaveType") REFERENCES "leave_type" ("code")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. leave_balance: enum -> text via shadow column
-- ---------------------------------------------------------------------------
ALTER TABLE "leave_balance" ADD COLUMN "leaveType_new" TEXT;
UPDATE "leave_balance"
SET "leaveType_new" = CASE
  WHEN "leaveType"::text = 'UNPAID' THEN 'UNPAID'
  ELSE 'ANNUAL'
END;

-- The previous unique index covers (userId, leaveType, year). Drop it before
-- swapping so we don't leave a stale index referencing the old column.
ALTER TABLE "leave_balance" DROP CONSTRAINT IF EXISTS "leave_balance_userId_leaveType_year_key";
DROP INDEX IF EXISTS "leave_balance_userId_leaveType_year_key";

ALTER TABLE "leave_balance" DROP COLUMN "leaveType";
ALTER TABLE "leave_balance" RENAME COLUMN "leaveType_new" TO "leaveType";
ALTER TABLE "leave_balance" ALTER COLUMN "leaveType" SET NOT NULL;

CREATE UNIQUE INDEX "leave_balance_userId_leaveType_year_key"
  ON "leave_balance" ("userId", "leaveType", "year");
CREATE INDEX "leave_balance_leaveType_idx" ON "leave_balance" ("leaveType");

ALTER TABLE "leave_balance"
  ADD CONSTRAINT "leave_balance_leaveType_fkey"
  FOREIGN KEY ("leaveType") REFERENCES "leave_type" ("code")
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 4. leave_change_request.newLeaveType: nullable enum -> nullable text
-- ---------------------------------------------------------------------------
ALTER TABLE "leave_change_request" ADD COLUMN "newLeaveType_new" TEXT;
UPDATE "leave_change_request"
SET "newLeaveType_new" = CASE
  WHEN "newLeaveType" IS NULL THEN NULL
  WHEN "newLeaveType"::text = 'UNPAID' THEN 'UNPAID'
  ELSE 'ANNUAL'
END;
ALTER TABLE "leave_change_request" DROP COLUMN "newLeaveType";
ALTER TABLE "leave_change_request" RENAME COLUMN "newLeaveType_new" TO "newLeaveType";
-- newLeaveType is nullable; no FK so admin can leave it empty.

-- ---------------------------------------------------------------------------
-- 5. Drop legacy structures
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "leave_entitlement_default";
DROP TYPE IF EXISTS "LeaveType";

-- ---------------------------------------------------------------------------
-- 6. Receipt: invoiceId optional, new clientId, presence check
-- ---------------------------------------------------------------------------
ALTER TABLE "receipts" ALTER COLUMN "invoiceId" DROP NOT NULL;
ALTER TABLE "receipts" ADD COLUMN "clientId" TEXT;

ALTER TABLE "receipts"
  ADD CONSTRAINT "receipts_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients" ("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX "receipts_clientId_idx" ON "receipts" ("clientId");

ALTER TABLE "receipts"
  ADD CONSTRAINT "receipts_invoice_or_client_chk"
  CHECK ("invoiceId" IS NOT NULL OR "clientId" IS NOT NULL);
