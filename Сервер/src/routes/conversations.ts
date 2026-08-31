import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { canMessage } from '../lib/messaging'
import { publicUserSelect } from '../lib/publicUser'
import { getOrCreateDirectConversation } from '../lib/conversations'
import { messageLimiter } from '../lib/rateLimit'
import { emitToUsers, isOnline } from '../lib/socket'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

function serializeMessage(m: { id: string; conversationId: string; senderId: string | null; senderUsername: string; body: string; createdAt: Date }) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderUsername: m.senderUsername,
    body: m.body,
    createdAt: m.createdAt,
  }
}

// GET /conversations — мои переписки, отсортированные по последней активности
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: publicUserSelect } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const conversations = await Promise.all(
      page.map(async (conv) => {
        const me = conv.participants.find((p) => p.userId === userId)
        const other = conv.participants.find((p) => p.userId !== userId)
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: me?.lastReadAt ?? new Date(0) },
          },
        })
        const last = conv.messages[0]
        return {
          id: conv.id,
          type: conv.type,
          otherUser: other?.user ?? null,
          // Только начальное значение для клиента — дальше он сам следит за
          // presence:update по сокету, live-статус тут не отслеживается
          otherUserOnline: other ? isOnline(other.userId) : false,
          lastMessage: last ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId } : null,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
        }
      })
    )

    res.json({ conversations, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /conversations/direct { userId } — получить/создать личную переписку
router.post(
  '/direct',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { userId: otherId } = req.body as { userId?: string }

    if (!otherId || typeof otherId !== 'string') throw new HttpError(400, 'Не указан пользователь')
    if (otherId === userId) throw new HttpError(400, 'Нельзя написать самому себе')

    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } })
    if (!other) throw new HttpError(404, 'Пользователь не найден')

    if (!(await canMessage(userId, otherId))) {
      throw new HttpError(403, 'Этому пользователю можно написать только вместе с заявкой в друзья')
    }

    const conversation = await getOrCreateDirectConversation(userId, otherId)
    res.json({ conversation: { id: conversation.id, type: conversation.type } })
  })
)

async function loadParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
}

// GET /conversations/:id/messages?cursor= — последняя (без cursor) или более старая страница
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const participant = await loadParticipant(req.params.id, userId)
    if (!participant) throw new HttpError(404, 'Переписка не найдена')

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? page[page.length - 1].id : null
    const messages = page.slice().reverse().map(serializeMessage)

    res.json({ messages, nextCursor })
  })
)

// POST /conversations/:id/messages { body }
router.post(
  '/:id/messages',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { body } = req.body as { body?: string }

    if (!body || typeof body !== 'string' || !body.trim()) throw new HttpError(400, 'Пустое сообщение')
    const trimmed = body.trim()
    if (trimmed.length > 4000) throw new HttpError(400, 'Сообщение слишком длинное')

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { participants: true },
    })
    if (!conversation) throw new HttpError(404, 'Переписка не найдена')
    const myParticipant = conversation.participants.find((p) => p.userId === userId)
    if (!myParticipant) throw new HttpError(403, 'Недостаточно прав')

    // Перепроверяем canMessage на КАЖДУЮ отправку, не только при создании
    // переписки — могли разфрендиться/заблокировать друг друга уже после
    // того, как чат был открыт на другой вкладке
    if (conversation.type === 'DIRECT') {
      const other = conversation.participants.find((p) => p.userId !== userId)
      if (other && !(await canMessage(userId, other.userId))) {
        throw new HttpError(403, 'Нельзя отправить сообщение этому пользователю')
      }
    }

    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        senderUsername: sender!.username,
        body: trimmed,
      },
    })
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } })

    const recipientIds = conversation.participants.filter((p) => p.userId !== userId).map((p) => p.userId)
    emitToUsers(recipientIds, 'message:new', { conversationId: conversation.id, message: serializeMessage(message) })

    res.status(201).json({ message: serializeMessage(message) })
  })
)

// POST /conversations/:id/read — отметить прочитанным до последнего сообщения
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const participant = await loadParticipant(req.params.id, userId)
    if (!participant) throw new HttpError(404, 'Переписка не найдена')

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    })

    res.json({ ok: true })
  })
)

export default router
