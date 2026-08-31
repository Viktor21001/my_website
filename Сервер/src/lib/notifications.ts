import type { NotificationType, Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { emitToUser } from './socket'

/*
  Точечные события (не чат — там свой счётчик непрочитанного через
  ConversationParticipant.lastReadAt, см. схему): заявки в друзья,
  вступление в группу, лайк/комментарий на своей записи, решение по
  жалобе. Пишет постоянную запись (колокольчик, GET /notifications) и
  тут же пушит её сокетом — отдельно от узких событий вроде
  "friendRequest:new" или "groupPost:new" (те правят конкретный кэш
  точечно), эта запись — персистентная история для колокольчика.
*/
export async function notify(userId: string, type: NotificationType, payload?: Record<string, unknown>) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined },
  })
  emitToUser(userId, 'notification:new', {
    id: notification.id,
    type,
    payload: payload ?? null,
    createdAt: notification.createdAt,
  })
  return notification
}
