import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/*
  logAdminAction — единая точка записи в AdminAuditLog, вызывается из
  каждого мутирующего хендлера routes/admin.ts. Журнал только на запись:
  эндпоинта на изменение/удаление записей нет и не будет (см. план).

  actorUsername/targetUsername сохраняются снэпшотом прямо сейчас, а не
  джойном на чтении — запись останется читаемой, даже если актёра или
  цель потом переименуют или удалят (actorId/targetId тогда станут null
  через onDelete: SetNull, а снэпшот имени останется).
*/

export type AdminAction =
  | 'BAN'
  | 'UNBAN'
  | 'DELETE_USER'
  | 'RESET_PASSWORD'
  | 'PROMOTE_ADMIN'
  | 'DEMOTE_ADMIN'

interface ActorTarget {
  id: string
  username: string
}

export function logAdminAction(
  actor: ActorTarget,
  target: ActorTarget,
  action: AdminAction,
  details?: Record<string, unknown>
) {
  return prisma.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorUsername: actor.username,
      targetId: target.id,
      targetUsername: target.username,
      action,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
