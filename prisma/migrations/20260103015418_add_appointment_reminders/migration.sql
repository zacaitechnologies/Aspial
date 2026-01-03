-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- DropForeignKey
ALTER TABLE "appointment_booking_emails" DROP CONSTRAINT "appointment_booking_emails_sentById_fkey";

-- AlterTable
ALTER TABLE "appointment_booking_emails" ALTER COLUMN "sentById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "appointment_booking_reminders" (
    "id" SERIAL NOT NULL,
    "appointmentBookingId" INTEGER NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_booking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_booking_reminders_status_idx" ON "appointment_booking_reminders"("status");

-- CreateIndex
CREATE INDEX "appointment_booking_reminders_remindAt_status_idx" ON "appointment_booking_reminders"("remindAt", "status");

-- Create partial indexes for performance (sweep optimization)
CREATE INDEX "idx_pending_reminders" ON "appointment_booking_reminders"("status") WHERE ("status" = 'PENDING');

-- CreateIndex for pending reminders by remindAt (sweep-friendly)
CREATE INDEX "idx_pending_remind_at" ON "appointment_booking_reminders"("remindAt") WHERE ("status" = 'PENDING');

-- CreateIndex
CREATE UNIQUE INDEX "appointment_booking_reminders_appointmentBookingId_offsetMi_key" ON "appointment_booking_reminders"("appointmentBookingId", "offsetMinutes");

-- AddForeignKey
ALTER TABLE "appointment_booking_emails" ADD CONSTRAINT "appointment_booking_emails_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_booking_reminders" ADD CONSTRAINT "appointment_booking_reminders_appointmentBookingId_fkey" FOREIGN KEY ("appointmentBookingId") REFERENCES "appointment_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
