/*
  Warnings:

  - You are about to drop the `super_performance_awards` table. If the table is not empty, all the data it contains will be lost.

*/

-- CreateEnum (if not exists)
DO $$ BEGIN
 CREATE TYPE "BenefitTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- DropForeignKey (if exists)
DO $$ BEGIN
 ALTER TABLE "super_performance_awards" DROP CONSTRAINT IF EXISTS "super_performance_awards_userId_fkey";
EXCEPTION
 WHEN undefined_table THEN null;
END $$;

-- DropTable (if exists)
DROP TABLE IF EXISTS "super_performance_awards";

-- CreateTable (if not exists)
DO $$ BEGIN
 CREATE TABLE "tier_selections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "tier" "BenefitTier" NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_selections_pkey" PRIMARY KEY ("id")
);
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- CreateIndex (if not exists)
DO $$ BEGIN
 CREATE UNIQUE INDEX "tier_selections_userId_year_key" ON "tier_selections"("userId", "year");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- AddForeignKey (if not exists)
DO $$ BEGIN
 ALTER TABLE "tier_selections" ADD CONSTRAINT "tier_selections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

