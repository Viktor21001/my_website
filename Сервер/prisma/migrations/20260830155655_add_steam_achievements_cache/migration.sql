-- AlterTable
ALTER TABLE "User" ADD COLUMN     "steamApiKey" TEXT;

-- CreateTable
CREATE TABLE "SteamGameAchievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "gameName" TEXT NOT NULL,
    "achievements" JSONB NOT NULL,
    "achievedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamGameAchievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SteamGameAchievements_userId_idx" ON "SteamGameAchievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGameAchievements_userId_appId_key" ON "SteamGameAchievements"("userId", "appId");

-- AddForeignKey
ALTER TABLE "SteamGameAchievements" ADD CONSTRAINT "SteamGameAchievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
