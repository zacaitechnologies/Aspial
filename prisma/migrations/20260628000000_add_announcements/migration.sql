-- CreateEnum
CREATE TYPE "AnnouncementBannerType" AS ENUM ('image', 'template');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'active', 'inactive');

-- CreateEnum
CREATE TYPE "AnnouncementTemplate" AS ENUM ('gradientGreen', 'creamGold', 'spotlightAccent');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerType" "AnnouncementBannerType" NOT NULL DEFAULT 'template',
    "imageUrl" TEXT,
    "templateKey" "AnnouncementTemplate" DEFAULT 'gradientGreen',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_status_startDate_endDate_idx" ON "announcements"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "announcements_sortOrder_idx" ON "announcements"("sortOrder");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
