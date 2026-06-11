-- Add cancellation tracking fields to appointment bookings
ALTER TABLE "appointment_bookings" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "appointment_bookings" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "appointment_bookings" ADD COLUMN "cancelledById" TEXT;

ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "user"("supabase_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: multi-assignee support for appointment bookings
CREATE TABLE "appointment_booking_assignees" (
    "bookingId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "appointment_booking_assignees_pkey" PRIMARY KEY ("bookingId","userId")
);

CREATE INDEX "appointment_booking_assignees_userId_idx" ON "appointment_booking_assignees"("userId");

ALTER TABLE "appointment_booking_assignees" ADD CONSTRAINT "appointment_booking_assignees_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "appointment_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_booking_assignees" ADD CONSTRAINT "appointment_booking_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("supabase_id") ON DELETE CASCADE ON UPDATE CASCADE;
