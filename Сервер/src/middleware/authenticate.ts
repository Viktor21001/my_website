import type { Request, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { resolveAuthenticatedUser } from '../lib/authCore'
import { asyncHandler } from '../lib/asyncHandler'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: Role
    }
  }
}

/*
  Роль и бан обязаны действовать немедленно (разжалование админа, бан) —
  токен живёт 30 дней и сам по себе отозван быть не может, поэтому
  единственный надёжный способ проверить это вовремя — сверяться с БД на
  каждый запрос, а не доверять клейму из токена. Сама проверка — в
  lib/authCore.ts (переиспользуется сокет-авторизацией, см. lib/socket.ts).
  req.userRole кладём здесь же, чтобы requireRole не делал повторный запрос.
*/
export const authenticate = asyncHandler(async (req: Request, _res, next: NextFunction) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  const user = await resolveAuthenticatedUser(token)

  req.userId = user.id
  req.userRole = user.role
  next()
})
