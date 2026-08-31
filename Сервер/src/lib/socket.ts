import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { resolveAuthenticatedUser } from './authCore'
import { prisma } from './prisma'

let io: SocketIOServer | undefined

/*
  userId -> число живых сокет-соединений (несколько вкладок/устройств
  сразу — обычное дело). Только для presence, в БД не сохраняется — тот же
  приём "в памяти, один инстанс сервиса", что уже применён для прогресса
  синхронизации Steam-достижений (см. routes/steamAchievements.ts).
*/
const onlineCounts = new Map<string, number>()

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/

/*
  Сокет — только push сервер->клиент (новое сообщение, презенс, дальше —
  заявки в друзья и уведомления). Ни одно действие клиент->сервер сюда не
  переезжает — отправка сообщения остаётся обычным REST-запросом через
  routes/conversations.ts, который делает все проверки (бан, приватность,
  чёрный список) так же, как сегодня, и уже ПОСЛЕ успешной записи в БД сам
  вызывает emitToUser(s). Так разжалование/бан продолжают действовать
  одинаково для HTTP и для сокета — оба идут через один и тот же
  resolveAuthenticatedUser (lib/authCore.ts).
*/
export function initSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (process.env.NODE_ENV === 'production') {
          return callback(null, origin === process.env.CLIENT_ORIGIN)
        }
        callback(null, LOCALHOST_ORIGIN.test(origin))
      },
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    resolveAuthenticatedUser(token ?? null)
      .then((user) => {
        socket.data.userId = user.id
        next()
      })
      .catch((err) => next(err instanceof Error ? err : new Error('Unauthorized')))
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    socket.join(`user:${userId}`)

    const nextCount = (onlineCounts.get(userId) ?? 0) + 1
    onlineCounts.set(userId, nextCount)
    if (nextCount === 1) {
      getFriendIds(userId).then((friendIds) => emitToUsers(friendIds, 'presence:update', { userId, online: true }))
    }

    socket.on('disconnect', () => {
      const remaining = (onlineCounts.get(userId) ?? 1) - 1
      if (remaining <= 0) {
        onlineCounts.delete(userId)
        getFriendIds(userId).then((friendIds) => emitToUsers(friendIds, 'presence:update', { userId, online: false }))
      } else {
        onlineCounts.set(userId, remaining)
      }
    })
  })
}

async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  })
  return rows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload)
}

export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  for (const id of userIds) emitToUser(id, event, payload)
}

export function isOnline(userId: string): boolean {
  return (onlineCounts.get(userId) ?? 0) > 0
}
