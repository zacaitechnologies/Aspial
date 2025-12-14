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

-- Migrate data from equipment to appointments
INSERT INTO "appointments" ("name", "location", "brand", "description", "appointmentType", "isAvailable", "createdAt", "updatedAt")
SELECT 
    "name",
    "type" as "location",
    "brand",
    COALESCE("model", '') || CASE WHEN "serialNumber" IS NOT NULL THEN ' (SN: ' || "serialNumber" || ')' ELSE '' END as "description",
    "appointmentType",
    "isAvailable",
    "createdAt",
    "updatedAt"
FROM "equipment";

-- Migrate data from studios to appointments
INSERT INTO "appointments" ("name", "location", "brand", "description", "appointmentType", "isAvailable", "createdAt", "updatedAt")
SELECT 
    "name",
    "location",
    NULL as "brand",
    "description",
    "appointmentType",
    "isActive" as "isAvailable",
    "createdAt",
    "updatedAt"
FROM "studios";

-- Update appointment_bookings to use appointmentId
ALTER TABLE "appointment_bookings" ADD COLUMN "appointmentId" INTEGER;

-- Create a temporary mapping table
CREATE TEMP TABLE equipment_to_appointment AS
SELECT 
    e.id as equipment_id,
    a.id as appointment_id
FROM "equipment" e
JOIN "appointments" a ON e.name = a.name AND a.brand IS NOT NULL
ORDER BY e.id, a.id;

CREATE TEMP TABLE studio_to_appointment AS
SELECT 
    s.id as studio_id,
    a.id as appointment_id
FROM "studios" s
JOIN "appointments" a ON s.name = a.name AND a.brand IS NULL
ORDER BY s.id, a.id;

-- Update appointment_bookings with equipmentId
UPDATE "appointment_bookings" ab
SET "appointmentId" = eta.appointment_id
FROM equipment_to_appointment eta
WHERE ab."equipmentId" = eta.equipment_id;

-- Update appointment_bookings with studioId
UPDATE "appointment_bookings" ab
SET "appointmentId" = sta.appointment_id
FROM studio_to_appointment sta
WHERE ab."studioId" = sta.studio_id AND ab."appointmentId" IS NULL;

-- DropForeignKey
ALTER TABLE "appointment_bookings" DROP CONSTRAINT IF EXISTS "appointment_bookings_equipmentId_fkey";
ALTER TABLE "appointment_bookings" DROP CONSTRAINT IF EXISTS "appointment_bookings_studioId_fkey";

-- DropTable
DROP TABLE IF EXISTS "bookings";
DROP TABLE IF EXISTS "studio_bookings";

-- AlterTable - Remove old columns
ALTER TABLE "appointment_bookings" DROP COLUMN IF EXISTS "equipmentId";
ALTER TABLE "appointment_bookings" DROP COLUMN IF EXISTS "studioId";

-- DropTable
DROP TABLE IF EXISTS "equipment";
DROP TABLE IF EXISTS "studios";

-- AddForeignKey
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
