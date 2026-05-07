/*
  Warnings:

  - You are about to drop the `delivery_order_photographers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "delivery_order_photographers" DROP CONSTRAINT "delivery_order_photographers_deliveryOrderId_fkey";

-- DropForeignKey
ALTER TABLE "delivery_order_photographers" DROP CONSTRAINT "delivery_order_photographers_userId_fkey";

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "taskId" INTEGER;

-- DropTable
DROP TABLE "delivery_order_photographers";

-- CreateIndex
CREATE INDEX "time_entries_taskId_idx" ON "time_entries"("taskId");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
