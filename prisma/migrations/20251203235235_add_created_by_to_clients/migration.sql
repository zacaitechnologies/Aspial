-- AlterTable: Add createdById column as nullable first
ALTER TABLE "clients" ADD COLUMN     "createdById" TEXT;

-- Update existing clients: Set createdById to the first admin user, or first user if no admin exists
UPDATE "clients" 
SET "createdById" = (
  SELECT u.id 
  FROM "user" u
  LEFT JOIN "user_role" ur ON u.id = ur."userId"
  LEFT JOIN "role" r ON ur."roleId" = r.id
  WHERE r.slug = 'admin'
  ORDER BY u."created_at" ASC
  LIMIT 1
)
WHERE "createdById" IS NULL;

-- If no admin exists, use the first user
UPDATE "clients" 
SET "createdById" = (
  SELECT id FROM "user" ORDER BY "created_at" ASC LIMIT 1
)
WHERE "createdById" IS NULL;

-- Now make it required
ALTER TABLE "clients" ALTER COLUMN "createdById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
