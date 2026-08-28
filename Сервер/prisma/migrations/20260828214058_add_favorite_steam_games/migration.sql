-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favoriteSteamAppIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
