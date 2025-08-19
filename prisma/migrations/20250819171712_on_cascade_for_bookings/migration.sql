-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "studio_bookings" DROP CONSTRAINT "studio_bookings_studioId_fkey";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_bookings" ADD CONSTRAINT "studio_bookings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
