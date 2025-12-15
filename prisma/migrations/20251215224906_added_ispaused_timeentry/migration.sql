/*
  Warnings:

  - You are about to drop the column `equipmentId` on the `appointment_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `appointment_bookings` table. All the data in the column will be lost.
  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `equipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studio_bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `studios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointment_bookings" DROP CONSTRAINT "appointment_bookings_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "appointment_bookings" DROP CONSTRAINT "appointment_bookings_studioId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_projectId_fkey";

-- DropForeignKey
ALTER TABLE "studio_bookings" DROP CONSTRAINT "studio_bookings_projectId_fkey";

-- DropForeignKey
ALTER TABLE "studio_bookings" DROP CONSTRAINT "studio_bookings_studioId_fkey";

-- AlterTable
ALTER TABLE "appointment_bookings" DROP COLUMN "equipmentId",
DROP COLUMN "studioId",
ADD COLUMN     "appointmentId" INTEGER;

-- AlterTable
ALTER TABLE "tier_selections" ADD COLUMN     "customTarget" INTEGER;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "isPause" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "isActive" SET DEFAULT false;

-- DropTable
DROP TABLE "bookings";

-- DropTable
DROP TABLE "equipment";

-- DropTable
DROP TABLE "studio_bookings";

-- DropTable
DROP TABLE "studios";

-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'OTHERS',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
