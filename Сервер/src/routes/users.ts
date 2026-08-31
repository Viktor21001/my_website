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

const PANEL_SECTIONS = ['general', 'profile', 'fitness', 'games']

// { left: string[], right: string[] } — форму содержимого (реальны ли эти id
// сейчас в реестре панелей) сервер не проверяет, реестр есть только на клиенте
function isPanelColumnLayout(value: unknown): boolean {
  return (
    typeof value === 'object' && value !== null &&
    Array.isArray((value as Record<string, unknown>).left) &&
    Array.isArray((value as Record<string, unknown>).right) &&
    (value as { left: unknown[] }).left.every((x) => typeof x === 'string') &&
    (value as { right: unknown[] }).right.every((x) => typeof x === 'string')
  )
}

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const { displayName, avatar, bio, location, timezone, exerciseLibraryName, githubUsername, steamId, steamApiKey, favoriteSteamAppIds, background, panelLayout, defaultSection, messagingPrivacy } = req.body ?? {}

    const MESSAGING_PRIVACY_VALUES = ['EVERYONE', 'FRIENDS_ONLY', 'NOBODY']
    if (messagingPrivacy !== undefined && !MESSAGING_PRIVACY_VALUES.includes(messagingPrivacy)) {
      throw new HttpError(400, 'Некорректное значение приватности сообщений')
    }

    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim() === '')) {
      throw new HttpError(400, 'Имя не может быть пустым')
    }
    if (
      favoriteSteamAppIds !== undefined &&
      (!Array.isArray(favoriteSteamAppIds) || !favoriteSteamAppIds.every((id: unknown) => typeof id === 'number'))
    ) {
      throw new HttpError(400, 'Некорректный список любимых игр')
    }
    // Intl сама знает полный список валидных IANA-идентификаторов —
    // не дублируем на сервере список часовых поясов из клиентского селекта
    if (timezone && (typeof timezone !== 'string' || !Intl.supportedValuesOf('timeZone').includes(timezone))) {
      throw new HttpError(400, 'Некорректный часовой пояс')
    }
    if (
      panelLayout !== undefined &&
      (typeof panelLayout !== 'object' || panelLayout === null || Array.isArray(panelLayout) ||
        !Object.entries(panelLayout).every(([key, value]) => PANEL_SECTIONS.includes(key) && isPanelColumnLayout(value)))
    ) {
      throw new HttpError(400, 'Некорректный порядок панелей')
    }
    if (defaultSection && !PANEL_SECTIONS.includes(defaultSection)) {
      throw new HttpError(400, 'Некорректная вкладка по умолчанию')
    }

    const data: Record<string, unknown> = {}
    if (displayName !== undefined) data.displayName = displayName
    if (avatar !== undefined) data.avatar = avatar || null
    if (bio !== undefined) data.bio = bio || null
    if (location !== undefined) data.location = location || null
    if (timezone !== undefined) data.timezone = timezone || null
    if (exerciseLibraryName !== undefined) data.exerciseLibraryName = exerciseLibraryName || null
    if (githubUsername !== undefined) data.githubUsername = githubUsername || null
    if (steamId !== undefined) data.steamId = steamId || null
    // '' — явная очистка ключа (кнопка «Удалить ключ»), непереданное поле
    // оставляем как есть — маскированное поле в Настройках не подгружает
    // текущее значение, так что «оставили пустым» и «хотим стереть» не
    // должны означать одно и то же
    if (steamApiKey !== undefined) data.steamApiKey = steamApiKey || null
    // Лимит в 7 проверяем и на сервере — не доверяем только клиентской валидации
    if (favoriteSteamAppIds !== undefined) data.favoriteSteamAppIds = favoriteSteamAppIds.slice(0, 7)
    // Клиент всегда шлёт весь объект по всем вкладкам целиком (не diff),
    // как и background пересобирается целиком перед отправкой
    if (panelLayout !== undefined) data.panelLayout = panelLayout
    if (defaultSection !== undefined) data.defaultSection = defaultSection || null
    if (messagingPrivacy !== undefined) data.messagingPrivacy = messagingPrivacy

    if (background !== undefined) {
      const bg = background as BackgroundInput
      if (typeof bg.type === 'string') data.backgroundType = bg.type
      if (typeof bg.url === 'string') data.backgroundUrl = bg.url
      if (typeof bg.blur === 'number') data.backgroundBlur = bg.blur
      if (typeof bg.opacity === 'number') data.backgroundOpacity = bg.opacity
    }

    const user = await prisma.user.update({ where: { id: req.userId! }, data })

    // Ключ явно удалён (не просто заменён другим) — без него синхронизация
    // достижений больше недоступна, старый кэш достижений тоже теряет смысл
    if (steamApiKey === '') {
      await prisma.steamGameAchievements.deleteMany({ where: { userId: req.userId! } })
    }

    res.json(serializeUser(user))
  })
)

export default router
