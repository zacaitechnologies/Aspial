-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('PHOTO_SHOOT', 'VIDEO_SHOOT', 'CONSULTATION', 'PHOTO_SELECTION', 'OTHERS');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "appointmentType" "AppointmentType" NOT NULL DEFAULT 'OTHERS';

-- AlterTable
ALTER TABLE "studio_bookings" ADD COLUMN "appointmentType" "AppointmentType" NOT NULL DEFAULT 'OTHERS';
