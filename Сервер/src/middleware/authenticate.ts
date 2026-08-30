import type { Request, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { verifyToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'
import { isCurrentlyBanned, formatBanMessage } from '../lib/ban'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from './errorHandler'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: Role
    }
  }
}

/*
  Раньше только проверяла подпись JWT, в БД не ходила. Роль и бан обязаны
  действовать немедленно (разжалование админа, бан) — токен живёт 30 дней
  и сам по себе отозван быть не может, поэтому единственный надёжный способ
  проверить это вовремя — сверяться с БД на каждый запрос, а не доверять
  клейму из токена. req.userRole кладём здесь же, чтобы requireRole не делал
  повторный запрос.
*/
export const authenticate = asyncHandler(async (req: Request, _res, next: NextFunction) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  if (!token) throw new HttpError(401, 'Требуется авторизация')

  let userId: string
  try {
    userId = verifyToken(token)
  } catch {
    throw new HttpError(401, 'Недействительный токен')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, bannedAt: true, bannedUntil: true, banReason: true },
  })

  if (!user) throw new HttpError(401, 'Недействительный токен')
  if (isCurrentlyBanned(user)) throw new HttpError(403, formatBanMessage(user))

  req.userId = user.id
  req.userRole = user.role
  next()
})
