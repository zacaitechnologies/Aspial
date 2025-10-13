-- AlterTable
ALTER TABLE "user" ADD COLUMN     "staffRoleId" TEXT;

-- CreateTable
CREATE TABLE "staff_role" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "staff_role_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "staff_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
