-- CreateEnum
CREATE TYPE "KpiSection" AS ENUM ('sales', 'operations');

-- CreateEnum
CREATE TYPE "KpiReportStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "KpiReplyChoice" AS ENUM ('too_high', 'fair', 'too_low');

-- CreateEnum
CREATE TYPE "KpiCategory" AS ENUM ('client_experience', 'sales_performance', 'work_quality', 'deadline_reliability', 'teamwork', 'growth_initiative');

-- CreateTable
CREATE TABLE "kpi_reports" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "section" "KpiSection" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "KpiReportStatus" NOT NULL DEFAULT 'draft',
    "finalScore" DOUBLE PRECISION,
    "overallComment" TEXT,
    "createdById" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "replyChoice" "KpiReplyChoice",
    "replyComment" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_category_scores" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "category" "KpiCategory" NOT NULL,
    "score" DOUBLE PRECISION,
    "comment" TEXT,

    CONSTRAINT "kpi_category_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_teamwork_ratings" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_teamwork_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_reports_year_month_idx" ON "kpi_reports"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_reports_employeeId_year_month_key" ON "kpi_reports"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_category_scores_reportId_category_key" ON "kpi_category_scores"("reportId", "category");

-- CreateIndex
CREATE INDEX "kpi_teamwork_ratings_year_month_rateeId_idx" ON "kpi_teamwork_ratings"("year", "month", "rateeId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_teamwork_ratings_year_month_raterId_rateeId_key" ON "kpi_teamwork_ratings"("year", "month", "raterId", "rateeId");

-- AddForeignKey
ALTER TABLE "kpi_reports" ADD CONSTRAINT "kpi_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_reports" ADD CONSTRAINT "kpi_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_category_scores" ADD CONSTRAINT "kpi_category_scores_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "kpi_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_teamwork_ratings" ADD CONSTRAINT "kpi_teamwork_ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_teamwork_ratings" ADD CONSTRAINT "kpi_teamwork_ratings_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "user"("supabase_id") ON DELETE RESTRICT ON UPDATE CASCADE;
