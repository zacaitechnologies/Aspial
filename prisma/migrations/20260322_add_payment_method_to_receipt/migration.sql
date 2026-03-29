-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'mydebit', 'visa', 'mastercard', 'qr');

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'bank_transfer';
