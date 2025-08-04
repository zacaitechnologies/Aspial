-- CreateTable
CREATE TABLE "project_permissions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT true,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "project_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_permissions_userId_projectId_key" ON "project_permissions"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "project_permissions" ADD CONSTRAINT "project_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("supabase_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_permissions" ADD CONSTRAINT "project_permissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
