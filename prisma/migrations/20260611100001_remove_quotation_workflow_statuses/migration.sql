-- Remove in_review / accepted / rejected from QuotationStatus.
-- Data migration must run BEFORE the enum swap:
--   in_review -> draft  (review concept removed)
--   rejected  -> draft  (rejected quotations were editable like drafts)
--   accepted  -> final  (accepted quotations were locked like finals)
UPDATE "quotations" SET "workflowStatus" = 'draft' WHERE "workflowStatus" IN ('in_review', 'rejected');
UPDATE "quotations" SET "workflowStatus" = 'final' WHERE "workflowStatus" = 'accepted';

-- Swap the enum type
CREATE TYPE "QuotationStatus_new" AS ENUM ('draft', 'final', 'cancelled');
ALTER TABLE "quotations" ALTER COLUMN "workflowStatus" DROP DEFAULT;
ALTER TABLE "quotations" ALTER COLUMN "workflowStatus" TYPE "QuotationStatus_new" USING ("workflowStatus"::text::"QuotationStatus_new");
ALTER TYPE "QuotationStatus" RENAME TO "QuotationStatus_old";
ALTER TYPE "QuotationStatus_new" RENAME TO "QuotationStatus";
DROP TYPE "QuotationStatus_old";
ALTER TABLE "quotations" ALTER COLUMN "workflowStatus" SET DEFAULT 'draft';
