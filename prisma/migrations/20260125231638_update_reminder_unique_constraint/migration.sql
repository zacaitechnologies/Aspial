-- AlterTable
ALTER TABLE "appointment_booking_reminders" DROP CONSTRAINT IF EXISTS "appointment_booking_reminders_appointmentBookingId_offsetMinutes_key";

-- AlterTable
ALTER TABLE "appointment_booking_reminders" ADD CONSTRAINT "appointment_booking_reminders_appointmentBookingId_offsetMinutes_recipientEmail_key" UNIQUE ("appointmentBookingId", "offsetMinutes", "recipientEmail");
