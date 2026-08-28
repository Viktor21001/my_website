import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  if (!token) {
    res.status(401).json({ error: 'Требуется авторизация' })
    return
  }

  try {
    req.userId = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
}
