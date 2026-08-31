import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { areBlocked } from '../lib/blocklist'
import { publicUserSelect } from '../lib/publicUser'
import { getOrCreateDirectConversation } from '../lib/conversations'
import { friendRequestLimiter } from '../lib/rateLimit'
import { emitToUser } from '../lib/socket'
import { notify } from '../lib/notifications'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

// GET /friends — список друзей, курсорная пагинация (тот же паттерн, что admin.ts)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: publicUserSelect }, addressee: { select: publicUserSelect } },
      orderBy: { respondedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const friends = page.map((f) => ({
      friendshipId: f.id,
      user: f.requesterId === userId ? f.addressee : f.requester,
      since: f.respondedAt,
    }))

    res.json({ friends, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// GET /friends/requests?direction=incoming|outgoing
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const direction = req.query.direction === 'outgoing' ? 'outgoing' : 'incoming'
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const where =
      direction === 'incoming'
        ? { status: 'PENDING' as const, addresseeId: userId }
        : { status: 'PENDING' as const, requesterId: userId }

    const rows = await prisma.friendship.findMany({
      where,
      include: { requester: { select: publicUserSelect }, addressee: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const requests = page.map((f) => ({
      id: f.id,
      user: direction === 'incoming' ? f.requester : f.addressee,
      message: f.requestMessage,
      createdAt: f.createdAt,
    }))

    res.json({ requests, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /friends/requests { addresseeId, message? }
router.post(
  '/requests',
  friendRequestLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { addresseeId, message } = req.body as { addresseeId?: string; message?: string }

    if (!addresseeId || typeof addresseeId !== 'string') throw new HttpError(400, 'Не указан получатель')
    if (addresseeId === userId) throw new HttpError(400, 'Нельзя отправить заявку самому себе')

    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
      select: { id: true, username: true, messagingPrivacy: true },
    })
    if (!addressee) throw new HttpError(404, 'Пользователь не найден')

    if (await areBlocked(userId, addresseeId)) throw new HttpError(403, 'Действие недоступно')

    const trimmedMessage = typeof message === 'string' ? message.trim() : ''
    if (trimmedMessage.length > 500) throw new HttpError(400, 'Сообщение слишком длинное')
    // NOBODY закрывает именно сообщения, не сами заявки в друзья — заявку
    // без текста отправить всё равно можно (см. lib/messaging.ts)
    if (trimmedMessage && addressee.messagingPrivacy === 'NOBODY') {
      throw new HttpError(403, 'Этот пользователь не принимает сообщения')
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    })

    if (existing?.status === 'ACCEPTED') throw new HttpError(409, 'Вы уже друзья')
    if (existing && existing.requesterId === userId) throw new HttpError(409, 'Заявка уже отправлена')

    // Встречная заявка (addressee уже отправлял(а) мне) — мгновенно
    // склеиваем в ACCEPTED вместо второй строки на ту же пару
    if (existing && existing.requesterId === addresseeId) {
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })

      const conversation = await getOrCreateDirectConversation(userId, addresseeId)
      if (existing.requestMessage) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: existing.requesterId,
            senderUsername: addressee.username,
            body: existing.requestMessage,
          },
        })
        await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } })
      }

      emitToUser(existing.requesterId, 'friendRequest:accepted', { friendshipId: accepted.id })
      await notify(existing.requesterId, 'FRIEND_REQUEST_ACCEPTED', { friendshipId: accepted.id })
      res.status(200).json({ friendship: accepted, autoAccepted: true })
      return
    }

    const created = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId, requestMessage: trimmedMessage || null },
    })

    emitToUser(addresseeId, 'friendRequest:new', { friendshipId: created.id })
    await notify(addresseeId, 'FRIEND_REQUEST_RECEIVED', { friendshipId: created.id })
    res.status(201).json({ friendship: created })
  })
)

// POST /friends/requests/:id/accept
router.post(
  '/requests/:id/accept',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } })
    if (!friendship || friendship.status !== 'PENDING') throw new HttpError(404, 'Заявка не найдена')
    if (friendship.addresseeId !== userId) throw new HttpError(403, 'Недостаточно прав')

    const requester = await prisma.user.findUnique({
      where: { id: friendship.requesterId },
      select: { username: true },
    })
    if (!requester) throw new HttpError(404, 'Пользователь не найден')

    const accepted = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })

    const conversation = await getOrCreateDirectConversation(friendship.requesterId, friendship.addresseeId)
    if (friendship.requestMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: friendship.requesterId,
          senderUsername: requester.username,
          body: friendship.requestMessage,
        },
      })
      await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } })
    }

    emitToUser(friendship.requesterId, 'friendRequest:accepted', { friendshipId: accepted.id })
    await notify(friendship.requesterId, 'FRIEND_REQUEST_ACCEPTED', { friendshipId: accepted.id })
    res.json({ friendship: accepted })
  })
)

// POST /friends/requests/:id/decline
router.post(
  '/requests/:id/decline',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } })
    if (!friendship || friendship.status !== 'PENDING') throw new HttpError(404, 'Заявка не найдена')
    if (friendship.addresseeId !== userId) throw new HttpError(403, 'Недостаточно прав')

    await prisma.friendship.delete({ where: { id: friendship.id } })
    res.json({ ok: true })
  })
)

// DELETE /friends/requests/:id — отмена своей исходящей заявки
router.delete(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } })
    if (!friendship || friendship.status !== 'PENDING') throw new HttpError(404, 'Заявка не найдена')
    if (friendship.requesterId !== userId) throw new HttpError(403, 'Недостаточно прав')

    await prisma.friendship.delete({ where: { id: friendship.id } })
    res.json({ ok: true })
  })
)

// DELETE /friends/:userId — разфрендить
router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const otherId = req.params.userId

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: userId },
        ],
      },
    })
    if (!friendship) throw new HttpError(404, 'Не найдено в друзьях')

    await prisma.friendship.delete({ where: { id: friendship.id } })
    res.json({ ok: true })
  })
)

export default router
