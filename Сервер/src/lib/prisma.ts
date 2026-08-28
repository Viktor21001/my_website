import { PrismaClient } from '@prisma/client'

/*
  Синглтон PrismaClient. В dev-режиме tsx watch перезапускает модуль
  при каждом изменении файла — без кеша на globalThis каждый рестарт
  плодил бы новое соединение с БД поверх старых.
*/
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
