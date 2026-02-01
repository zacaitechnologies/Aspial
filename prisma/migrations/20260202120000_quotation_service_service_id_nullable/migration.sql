-- AlterTable: Allow QuotationService.serviceId to be NULL when the row links a custom service (customServiceId set).
-- This fixes foreign key violation when approving custom services (no dummy Services id required).
ALTER TABLE "quotation_services" ALTER COLUMN "serviceId" DROP NOT NULL;
