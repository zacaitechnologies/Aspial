-- CreateEnum
CREATE TYPE "AppointmentCategory" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "appointment_bookings" ADD COLUMN "appointmentCategory" "AppointmentCategory" NOT NULL DEFAULT 'INTERNAL';
