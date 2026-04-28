-- Migrate LeaveType to PAID | UNPAID (all former paid bucket types -> PAID)

CREATE TYPE "LeaveType_new" AS ENUM ('PAID', 'UNPAID');

-- leave_application
ALTER TABLE "leave_application" ALTER COLUMN "leaveType" DROP DEFAULT;
ALTER TABLE "leave_application" ALTER COLUMN "leaveType" TYPE "LeaveType_new" USING (
  CASE WHEN "leaveType"::text = 'UNPAID' THEN 'UNPAID'::"LeaveType_new" ELSE 'PAID'::"LeaveType_new" END
);

-- leave_change_request (nullable)
ALTER TABLE "leave_change_request" ALTER COLUMN "newLeaveType" TYPE "LeaveType_new" USING (
  CASE
    WHEN "newLeaveType" IS NULL THEN NULL
    WHEN "newLeaveType"::text = 'UNPAID' THEN 'UNPAID'::"LeaveType_new"
    ELSE 'PAID'::"LeaveType_new"
  END
);

-- leave_balance: merge rows per user/year, then recreate
CREATE TEMP TABLE _lb_keys AS
SELECT DISTINCT "userId", year FROM "leave_balance";

CREATE TEMP TABLE _lb_paid AS
SELECT
  "userId",
  year,
  COALESCE(
    NULLIF(MAX(CASE WHEN "leaveType"::text != 'UNPAID' THEN entitled END), NULL),
    14
  ) AS entitled,
  COALESCE(SUM(CASE WHEN "leaveType"::text != 'UNPAID' THEN used ELSE 0 END), 0) AS used,
  COALESCE(SUM(CASE WHEN "leaveType"::text != 'UNPAID' THEN pending ELSE 0 END), 0) AS pending
FROM "leave_balance"
GROUP BY "userId", year;

CREATE TEMP TABLE _lb_unpaid AS
SELECT
  "userId",
  year,
  COALESCE(SUM(CASE WHEN "leaveType"::text = 'UNPAID' THEN used ELSE 0 END), 0) AS used,
  COALESCE(SUM(CASE WHEN "leaveType"::text = 'UNPAID' THEN pending ELSE 0 END), 0) AS pending
FROM "leave_balance"
GROUP BY "userId", year;

DELETE FROM "leave_balance";

ALTER TABLE "leave_balance" ALTER COLUMN "leaveType" TYPE "LeaveType_new" USING ('PAID'::"LeaveType_new");

INSERT INTO "leave_balance" ("userId", "leaveType", year, entitled, used, pending, balance, "created_at", "updated_at")
SELECT
  k."userId",
  'PAID'::"LeaveType_new",
  k.year,
  COALESCE(p.entitled, 14),
  COALESCE(p.used, 0),
  COALESCE(p.pending, 0),
  COALESCE(p.entitled, 14) - COALESCE(p.used, 0) - COALESCE(p.pending, 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM _lb_keys k
LEFT JOIN _lb_paid p ON p."userId" = k."userId" AND p.year = k.year;

INSERT INTO "leave_balance" ("userId", "leaveType", year, entitled, used, pending, balance, "created_at", "updated_at")
SELECT
  k."userId",
  'UNPAID'::"LeaveType_new",
  k.year,
  0,
  COALESCE(u.used, 0),
  COALESCE(u.pending, 0),
  - COALESCE(u.used, 0) - COALESCE(u.pending, 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM _lb_keys k
LEFT JOIN _lb_unpaid u ON u."userId" = k."userId" AND u.year = k.year;

-- leave_entitlement_default
DELETE FROM "leave_entitlement_default";
ALTER TABLE "leave_entitlement_default" ALTER COLUMN "leaveType" TYPE "LeaveType_new" USING ('PAID'::"LeaveType_new");

INSERT INTO "leave_entitlement_default" ("leaveType", "entitledDays", "created_at", "updated_at")
VALUES
  ('PAID'::"LeaveType_new", 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('UNPAID'::"LeaveType_new", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

DROP TYPE "LeaveType";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";
