import jwt from 'jsonwebtoken'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} не задан в .env`)
  return value
}

const JWT_SECRET = requireEnv('JWT_SECRET')

const EXPIRES_IN = '30d'

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
  return payload.sub
}
