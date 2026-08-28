import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { serializeUser } from '../lib/serializeUser'

const router = Router()
router.use(authenticate)

interface BackgroundInput {
  type?: unknown
  url?: unknown
  blur?: unknown
  opacity?: unknown
}

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const { displayName, avatar, bio, location, githubUsername, steamId, favoriteSteamAppIds, background } = req.body ?? {}

    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim() === '')) {
      throw new HttpError(400, 'Имя не может быть пустым')
    }
    if (
      favoriteSteamAppIds !== undefined &&
      (!Array.isArray(favoriteSteamAppIds) || !favoriteSteamAppIds.every((id: unknown) => typeof id === 'number'))
    ) {
      throw new HttpError(400, 'Некорректный список любимых игр')
    }

    const data: Record<string, unknown> = {}
    if (displayName !== undefined) data.displayName = displayName
    if (avatar !== undefined) data.avatar = avatar || null
    if (bio !== undefined) data.bio = bio || null
    if (location !== undefined) data.location = location || null
    if (githubUsername !== undefined) data.githubUsername = githubUsername || null
    if (steamId !== undefined) data.steamId = steamId || null
    // Лимит в 7 проверяем и на сервере — не доверяем только клиентской валидации
    if (favoriteSteamAppIds !== undefined) data.favoriteSteamAppIds = favoriteSteamAppIds.slice(0, 7)

    if (background !== undefined) {
      const bg = background as BackgroundInput
      if (typeof bg.type === 'string') data.backgroundType = bg.type
      if (typeof bg.url === 'string') data.backgroundUrl = bg.url
      if (typeof bg.blur === 'number') data.backgroundBlur = bg.blur
      if (typeof bg.opacity === 'number') data.backgroundOpacity = bg.opacity
    }

    const user = await prisma.user.update({ where: { id: req.userId! }, data })
    res.json(serializeUser(user))
  })
)

export default router
