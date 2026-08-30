import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@prisma/client'
import { HttpError } from './errorHandler'

/*
  requireRole — ставится после authenticate (использует req.userRole,
  который authenticate уже прочитал из БД — повторный запрос не нужен).
  Используется и как общий гейт роутера (requireRole('ADMIN','CREATOR')),
  и точечно на отдельных ручках, которые доступны только Создателю
  (requireRole('CREATOR')).
*/
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole || !allowed.includes(req.userRole)) {
      throw new HttpError(403, 'Недостаточно прав')
    }
    next()
  }
}
