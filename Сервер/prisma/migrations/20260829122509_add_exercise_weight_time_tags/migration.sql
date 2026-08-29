-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "bodyweightOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTimeBased" BOOLEAN NOT NULL DEFAULT false;
