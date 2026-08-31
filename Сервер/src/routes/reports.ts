import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { friendRequestLimiter } from '../lib/rateLimit'
import type { Report } from '@prisma/client'

const router = Router()
router.use(authenticate)

const REPORT_CATEGORIES = ['HARASSMENT', 'SPAM', 'SCAM', 'INAPPROPRIATE_PROFILE', 'OTHER']

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

export function serializeReport(r: Report) {
  return {
    id: r.id,
    reporterUsername: r.reporterUsername,
    reportedId: r.reportedId,
    reportedUsername: r.reportedUsername,
    category: r.category,
    description: r.description,
    status: r.status,
    resolvedByUsername: r.resolvedByUsername,
    resolutionAction: r.resolutionAction,
    resolutionNote: r.resolutionNote,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
  }
}

// POST /reports { reportedUserId, category, description }
router.post(
  '/',
  friendRequestLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { reportedUserId, category, description } = req.body as { reportedUserId?: string; category?: string; description?: string }

    if (!reportedUserId || typeof reportedUserId !== 'string') throw new HttpError(400, 'Не указан пользователь')
    if (reportedUserId === userId) throw new HttpError(400, 'Нельзя пожаловаться на самого себя')
    if (!category || !REPORT_CATEGORIES.includes(category)) throw new HttpError(400, 'Некорректная категория жалобы')
    if (!description || typeof description !== 'string' || !description.trim()) {
      throw new HttpError(400, 'Опишите, в чём заключается нарушение')
    }
    if (description.length > 2000) throw new HttpError(400, 'Слишком длинное описание')

    const reporter = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    const reported = await prisma.user.findUnique({ where: { id: reportedUserId }, select: { username: true } })
    if (!reported) throw new HttpError(404, 'Пользователь не найден')

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reporterUsername: reporter!.username,
        reportedId: reportedUserId,
        reportedUsername: reported.username,
        category: category as Report['category'],
        description: description.trim(),
      },
    })

    res.status(201).json({ report: serializeReport(report) })
  })
)

// GET /reports/mine?cursor= — мои поданные жалобы и их исход
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    res.json({ reports: page.map(serializeReport), nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

export default router
