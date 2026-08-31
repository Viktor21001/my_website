import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { publicUserSelect } from '../lib/publicUser'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

// GET /blocks — чёрный список, курсорная пагинация
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const blocks = page.map((b) => ({ id: b.id, user: b.blocked, createdAt: b.createdAt }))

    res.json({ blocks, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /blocks { userId }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { userId: targetId } = req.body as { userId?: string }

    if (!targetId || typeof targetId !== 'string') throw new HttpError(400, 'Не указан пользователь')
    if (targetId === userId) throw new HttpError(400, 'Нельзя заблокировать самого себя')

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })
    if (!target) throw new HttpError(404, 'Пользователь не найден')

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    })

    // Блокировка рвёт дружбу в любую сторону, если она была
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    })

    res.status(201).json({ ok: true })
  })
)

// DELETE /blocks/:userId
router.delete(
  '/:userId',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: req.params.userId } })
    res.json({ ok: true })
  })
)

export default router
