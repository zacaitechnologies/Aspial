-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "serviceId" INTEGER;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
