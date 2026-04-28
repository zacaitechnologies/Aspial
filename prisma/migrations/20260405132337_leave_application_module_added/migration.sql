-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'MEDICAL', 'EMERGENCY', 'UNPAID', 'HOSPITALIZATION', 'COMPASSIONATE', 'MATERNITY', 'PATERNITY', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveHalfDay" AS ENUM ('NONE', 'FIRST_HALF', 'SECOND_HALF');

-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('CANCEL', 'EDIT');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "leave_application" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "halfDay" "LeaveHalfDay" NOT NULL DEFAULT 'NONE',
    "reason" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "totalDays" DOUBLE PRECISION NOT NULL,
    "unpaidDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balance" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "entitled" DOUBLE PRECISION NOT NULL,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_change_request" (
    "id" SERIAL NOT NULL,
    "leaveApplicationId" INTEGER NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "newStartDate" TIMESTAMP(3),
    "newEndDate" TIMESTAMP(3),
    "newLeaveType" "LeaveType",
    "newHalfDay" "LeaveHalfDay",
    "newReason" TEXT,
    "adminRemarks" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_change_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_entitlement_default" (
    "id" SERIAL NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "entitledDays" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_entitlement_default_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_application_userId_idx" ON "leave_application"("userId");

-- CreateIndex
CREATE INDEX "leave_application_status_idx" ON "leave_application"("status");

-- CreateIndex
CREATE INDEX "leave_balance_userId_year_idx" ON "leave_balance"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balance_userId_leaveType_year_key" ON "leave_balance"("userId", "leaveType", "year");

-- CreateIndex
CREATE INDEX "leave_change_request_leaveApplicationId_idx" ON "leave_change_request"("leaveApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_entitlement_default_leaveType_key" ON "leave_entitlement_default"("leaveType");

-- AddForeignKey
ALTER TABLE "leave_application" ADD CONSTRAINT "leave_application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_application" ADD CONSTRAINT "leave_application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance" ADD CONSTRAINT "leave_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_change_request" ADD CONSTRAINT "leave_change_request_leaveApplicationId_fkey" FOREIGN KEY ("leaveApplicationId") REFERENCES "leave_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_change_request" ADD CONSTRAINT "leave_change_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_change_request" ADD CONSTRAINT "leave_change_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
