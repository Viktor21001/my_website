import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    res.json({ notifications: page, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({ where: { userId: req.userId!, readAt: null } })
    res.json({ count })
  })
)

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification || notification.userId !== userId) throw new HttpError(404, 'Уведомление не найдено')

    await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } })
    res.json({ ok: true })
  })
)

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.userId!, readAt: null }, data: { readAt: new Date() } })
    res.json({ ok: true })
  })
)

export default router
