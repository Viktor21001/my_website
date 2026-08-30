-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'CREATOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedByUserId" TEXT,
ADD COLUMN     "bannedUntil" TIMESTAMP(3),
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorUsername" TEXT NOT NULL,
    "targetId" TEXT,
    "targetUsername" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bannedByUserId_fkey" FOREIGN KEY ("bannedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ровно один CREATOR: Prisma DSL не выражает partial unique index (WHERE),
-- поэтому дописано вручную. Даже баг в коде приложения не даст появиться
-- второму CREATOR — вставка/апдейт второй такой строки упадёт на уровне БД.
CREATE UNIQUE INDEX "User_singleton_creator" ON "User"("role") WHERE "role" = 'CREATOR';

-- Назначение Создателя — единожды, по email. Идемпотентно (безопасно при
-- повторном прогоне/пустой БД): если аккаунта с таким email ещё нет — no-op,
-- CREATOR тогда назначается вручную одной SQL-командой при необходимости;
-- если CREATOR уже назначен (например, при повторном запуске миграций
-- на существующей БД) — тоже no-op, WHERE NOT EXISTS не даст перезаписать.
UPDATE "User" SET "role" = 'CREATOR'
WHERE "email" = 'victor.eliseev2@yandex.ru'
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'CREATOR');
