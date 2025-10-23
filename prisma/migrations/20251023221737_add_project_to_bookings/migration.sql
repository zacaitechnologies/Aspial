-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "projectId" INTEGER;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
