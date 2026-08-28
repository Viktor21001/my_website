import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { User } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { toClientAgeGroup, toDbAgeGroup } from '../lib/ageGroup'

const router = Router()

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    ageGroup: toClientAgeGroup(user.ageGroup),
    createdAt: user.createdAt,
  }
}

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
      data: { email, username, passwordHash, displayName, ageGroup: dbAgeGroup },
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

export default router
