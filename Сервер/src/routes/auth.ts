import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { toDbAgeGroup } from '../lib/ageGroup'
import { serializeUser } from '../lib/serializeUser'
import { isCurrentlyBanned, formatBanMessage } from '../lib/ban'

const router = Router()

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, username, password, displayName, ageGroup } = req.body ?? {}

    if (!email || !username || !password || !displayName || !ageGroup) {
      throw new HttpError(400, 'Заполните все поля')
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new HttpError(400, 'Пароль должен быть не короче 6 символов')
    }
    const dbAgeGroup = toDbAgeGroup(ageGroup)
    if (!dbAgeGroup) {
      throw new HttpError(400, 'Некорректная возрастная группа')
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) {
      throw new HttpError(409, 'Пользователь с таким email или логином уже существует')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      // defaultSection: 'general' — только для новых аккаунтов, явно.
      // Существующие аккаунты остаются с null (прежнее поведение — Dev)
      data: { email, username, passwordHash, displayName, ageGroup: dbAgeGroup, defaultSection: 'general' },
    })

    const token = signToken(user.id)
    res.status(201).json({ token, user: serializeUser(user) })
  })
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { emailOrUsername, password } = req.body ?? {}
    if (!emailOrUsername || !password) {
      throw new HttpError(400, 'Введите логин и пароль')
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    })
    if (!user) throw new HttpError(401, 'Неверный логин или пароль')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new HttpError(401, 'Неверный логин или пароль')

    if (isCurrentlyBanned(user)) throw new HttpError(403, formatBanMessage(user))

    const token = signToken(user.id)
    res.json({ token, user: serializeUser(user) })
  })
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) throw new HttpError(404, 'Пользователь не найден')
    res.json({ user: serializeUser(user) })
  })
)

router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body ?? {}
    if (!oldPassword || !newPassword) {
      throw new HttpError(400, 'Укажите старый и новый пароль')
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new HttpError(400, 'Новый пароль должен быть не короче 6 символов')
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) throw new HttpError(404, 'Пользователь не найден')

    const valid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!valid) throw new HttpError(401, 'Старый пароль неверен')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    res.json({ ok: true })
  })
)

export default router
