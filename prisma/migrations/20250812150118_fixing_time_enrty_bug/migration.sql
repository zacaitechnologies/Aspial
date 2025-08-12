-- DropForeignKey
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_userId_fkey";

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
