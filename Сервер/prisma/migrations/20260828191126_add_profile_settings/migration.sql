-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundBlur" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "backgroundOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
ADD COLUMN     "backgroundType" TEXT NOT NULL DEFAULT 'preset',
ADD COLUMN     "backgroundUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "githubUsername" TEXT,
ADD COLUMN     "steamId" TEXT;
