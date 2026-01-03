-- CreateTable
CREATE TABLE "appointment_booking_emails" (
    "id" SERIAL NOT NULL,
    "appointmentBookingId" INTEGER NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,

    CONSTRAINT "appointment_booking_emails_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointment_booking_emails" ADD CONSTRAINT "appointment_booking_emails_appointmentBookingId_fkey" FOREIGN KEY ("appointmentBookingId") REFERENCES "appointment_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_booking_emails" ADD CONSTRAINT "appointment_booking_emails_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
