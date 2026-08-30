-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "exerciseLibraryName" TEXT;

-- CreateIndex
CREATE INDEX "Exercise_createdByUserId_idx" ON "Exercise"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
