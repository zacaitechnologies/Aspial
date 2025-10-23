-- AlterTable
ALTER TABLE "studio_bookings" ADD COLUMN     "projectId" INTEGER;

-- AddForeignKey
ALTER TABLE "studio_bookings" ADD CONSTRAINT "studio_bookings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
