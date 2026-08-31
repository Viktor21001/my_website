import type { Role } from '@prisma/client'
import { verifyToken } from './jwt'
import { prisma } from './prisma'
import { isCurrentlyBanned, formatBanMessage } from './ban'
import { HttpError } from '../middleware/errorHandler'

export interface AuthenticatedUser {
  id: string
  role: Role
}

/*
  Общая проверка токена, вынесенная из middleware/authenticate.ts — теперь
  переиспользуется и HTTP-мидлваром, и сокет-авторизацией (lib/socket.ts),
  чтобы правило бана/роли не продублировалось (и со временем не разошлось)
  в двух местах. HttpError — просто Error с полем status, транспорт-агностична:
  HTTP-мидлвар отдаёт её как есть, сокет-мидлвар читает только .message.
*/
export async function resolveAuthenticatedUser(token: string | null): Promise<AuthenticatedUser> {
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

  return { id: user.id, role: user.role }
}
