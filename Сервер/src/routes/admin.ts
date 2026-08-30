import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import type { Role, User } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/requireRole'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { logAdminAction } from '../lib/audit'

const router = Router()
router.use(authenticate, requireRole('ADMIN', 'CREATOR'))

const userListSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
  createdAt: true,
  bannedAt: true,
  bannedUntil: true,
  banReason: true,
} satisfies Prisma.UserSelect

/*
  Иерархия и её защита — единая проверка, вызывается первой строкой из
  каждого мутирующего хендлера ниже:
  - CREATOR не может быть целью НИКОГДА, вне зависимости от того, кто
    запрашивает (даже сам CREATOR — на себя эти ручки не рассчитаны).
  - Целью-ADMIN может быть только запрос от CREATOR — обычный ADMIN
    действует только на обычных USER.
  - Никто не может быть целью для самого себя — для себя есть Настройки,
    не админ-панель.
*/
function assertCanModerate(actor: { id: string; role: Role }, target: Pick<User, 'id' | 'role'>) {
  if (target.id === actor.id) {
    throw new HttpError(400, 'Нельзя применить это действие к самому себе')
  }
  if (target.role === 'CREATOR') {
    throw new HttpError(403, 'Это действие нельзя применить к Создателю сервиса')
  }
  if (target.role === 'ADMIN' && actor.role !== 'CREATOR') {
    throw new HttpError(403, 'Действия над администраторами доступны только Создателю')
  }
}

async function loadActor(req: { userId?: string }) {
  const actor = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, username: true, role: true } })
  if (!actor) throw new HttpError(404, 'Пользователь не найден')
  return actor
}

async function loadTarget(id: string) {
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw new HttpError(404, 'Пользователь не найден')
  return target
}

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100)

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}

    const users = await prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = users.length > limit
    const page = hasMore ? users.slice(0, limit) : users
    res.json({
      users: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    })
  })
)

router.post(
  '/users/:id/ban',
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    assertCanModerate(actor, target)

    const { days, reason } = req.body ?? {}
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new HttpError(400, 'Укажите причину бана')
    }
    let bannedUntil: Date | null = null
    if (days !== undefined && days !== null) {
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        throw new HttpError(400, 'Срок бана должен быть от 1 до 3650 дней')
      }
      bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { bannedAt: new Date(), bannedUntil, banReason: reason.trim(), bannedByUserId: actor.id },
    })
    await logAdminAction(actor, target, 'BAN', { days: days ?? null, reason: reason.trim() })

    res.json({ ok: true })
  })
)

router.post(
  '/users/:id/unban',
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    assertCanModerate(actor, target)

    await prisma.user.update({
      where: { id: target.id },
      data: { bannedAt: null, bannedUntil: null, banReason: null, bannedByUserId: null },
    })
    await logAdminAction(actor, target, 'UNBAN')

    res.json({ ok: true })
  })
)

// Пароль нигде не сохраняется и не логируется — только в теле ЭТОГО ответа,
// один раз. Алфавит без визуально похожих символов (0/O, 1/l/I), чтобы
// администратору было проще продиктовать его пользователю без ошибок
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function generateTempPassword(length = 12): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length]
  }
  return out
}

router.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    assertCanModerate(actor, target)

    const password = generateTempPassword()
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash } })
    await logAdminAction(actor, target, 'RESET_PASSWORD')

    res.json({ password })
  })
)

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    assertCanModerate(actor, target)

    try {
      await prisma.user.delete({ where: { id: target.id } })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new HttpError(409, 'Нельзя удалить — у пользователя есть упражнения, использованные в чужих тренировках')
      }
      throw err
    }
    // Логируем только реально случившееся удаление — targetId у AdminAuditLog
    // не FK (в отличие от actorId), удалённый пользователь тут не проблема
    await logAdminAction(actor, target, 'DELETE_USER')

    res.status(204).send()
  })
)

router.post(
  '/users/:id/promote',
  requireRole('CREATOR'),
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    if (target.id === actor.id) throw new HttpError(400, 'Нельзя применить это действие к самому себе')
    if (target.role !== 'USER') throw new HttpError(400, 'Пользователь уже не обычный участник')

    await prisma.user.update({ where: { id: target.id }, data: { role: 'ADMIN' } })
    await logAdminAction(actor, target, 'PROMOTE_ADMIN', { previousRole: target.role, newRole: 'ADMIN' })

    res.json({ ok: true })
  })
)

router.post(
  '/users/:id/demote',
  requireRole('CREATOR'),
  asyncHandler(async (req, res) => {
    const actor = await loadActor(req)
    const target = await loadTarget(req.params.id)
    if (target.id === actor.id) throw new HttpError(400, 'Нельзя применить это действие к самому себе')
    if (target.role !== 'ADMIN') throw new HttpError(400, 'Пользователь не администратор')

    await prisma.user.update({ where: { id: target.id }, data: { role: 'USER' } })
    await logAdminAction(actor, target, 'DEMOTE_ADMIN', { previousRole: target.role, newRole: 'USER' })

    res.json({ ok: true })
  })
)

router.get(
  '/audit-log',
  requireRole('CREATOR'),
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)

    const entries = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = entries.length > limit
    const page = hasMore ? entries.slice(0, limit) : entries
    res.json({
      entries: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    })
  })
)

export default router
