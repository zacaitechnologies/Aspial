-- AlterTable: add per-quotation description override snapshot
ALTER TABLE "quotation_services" ADD COLUMN "descriptionOverride" TEXT;
