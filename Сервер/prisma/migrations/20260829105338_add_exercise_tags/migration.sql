-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "compound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minLevel" "ExperienceLevel" NOT NULL DEFAULT 'beginner';
