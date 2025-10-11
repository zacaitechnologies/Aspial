/*
  Warnings:

  - You are about to drop the `_ServiceTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ServiceTags" DROP CONSTRAINT "_ServiceTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_ServiceTags" DROP CONSTRAINT "_ServiceTags_B_fkey";

-- DropTable
DROP TABLE "_ServiceTags";

-- CreateTable
CREATE TABLE "_ServiceToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ServiceToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ServiceToTag_B_index" ON "_ServiceToTag"("B");

-- AddForeignKey
ALTER TABLE "_ServiceToTag" ADD CONSTRAINT "_ServiceToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "service_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToTag" ADD CONSTRAINT "_ServiceToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
