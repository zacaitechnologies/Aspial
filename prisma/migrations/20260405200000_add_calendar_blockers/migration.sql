-- CreateTable
CREATE TABLE "calendar_blockers" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "blocksAppointments" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_blockers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calendar_blockers" ADD CONSTRAINT "calendar_blockers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
