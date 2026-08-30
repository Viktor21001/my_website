/*
  steamAchievements — достижения пользователя по всей его Steam-библиотеке.

  В отличие от остальной Steam-интеграции (см. devprofile/src/store/api/
  steamApi.ts) это НЕ проксируется через Vite и не использует общий
  VITE_STEAM_API_KEY: библиотека может быть 200+ игр, и достать по ним
  достижения — это 2-3 запроса к Steam Web API НА ИГРУ. Делать такое
  прямо из браузера при каждой загрузке страницы значит сотни
  параллельных запросов с публично видимым ключом — поэтому синк идёт
  здесь, с личным ключом пользователя, а результат складывается в БД
  (SteamGameAchievements). Клиент обычно просто читает уже готовый кэш
  (GET /).

  POST /sync раньше держал HTTP-соединение открытым на всё время синка
  (десятки секунд — минуты на большую библиотеку) — вся вкладка выглядела
  зависшей, а прогресса видно не было. Теперь синк идёт в фоне отдельной
  функцией (без await в хендлере), сам запрос отвечает сразу же — total
  игр и статус running, а прогресс (сколько уже обработано) читается
  отдельным поллингом GET /sync/status. Прогресс — просто Map в памяти
  процесса: это личный небольшой сервис на одном инстансе, отдельная
  очередь задач/Redis тут явно лишняя.
*/

import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

const STEAM_API = 'https://api.steampowered.com'
// Не бомбим Steam сотнями параллельных запросов разом — расплачиваться
// придётся тротлингом/банов ключа. 5 игр одновременно — компромисс между
// скоростью полной синхронизации (200+ игр) и вежливостью к чужому API.
const CONCURRENCY = 5

interface SteamOwnedGame {
  appid: number
  name: string
  playtime_forever: number
}

interface AchievementDetail {
  apiname: string
  displayName: string
  description: string
  icon: string
  iconGray: string
  unlocked: boolean
  unlockTime: number | null
  globalPercent: number | null
}

interface SyncProgress {
  status: 'idle' | 'running' | 'done' | 'error'
  processed: number
  total: number
  gamesSynced: number
  error?: string
}

// userId -> прогресс текущей/последней синхронизации
const progressByUser = new Map<string, SyncProgress>()

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Steam API ответил ${res.status}`)
  return res.json()
}

async function fetchOwnedGames(steamId: string, apiKey: string): Promise<SteamOwnedGame[]> {
  const data = await fetchJson(
    `${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true`
  )
  return data.response?.games ?? []
}

/*
  Для одной игры — три запроса параллельно: что игрок получил
  (GetPlayerAchievements), схема достижений с названиями/описаниями/иконками
  (GetSchemaForGame) и глобальный процент игроков, у кого есть каждое
  достижение (GetGlobalAchievementPercentagesForApp, не требует ключа).
  Игры без статистики или с закрытым профилем просто пропускаем.
*/
async function fetchGameAchievements(
  appId: number,
  steamId: string,
  apiKey: string
): Promise<{ achievements: AchievementDetail[]; achievedCount: number; totalCount: number } | null> {
  const [achRes, schemaRes, globalRes] = await Promise.allSettled([
    fetchJson(`${STEAM_API}/ISteamUserStats/GetPlayerAchievements/v0001/?key=${apiKey}&steamid=${steamId}&appid=${appId}`),
    fetchJson(`${STEAM_API}/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}`),
    fetchJson(`${STEAM_API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`),
  ])

  if (achRes.status !== 'fulfilled') return null
  const list = achRes.value?.playerstats?.achievements
  if (!Array.isArray(list) || list.length === 0) return null

  const schemaList =
    schemaRes.status === 'fulfilled' ? (schemaRes.value?.game?.availableGameStats?.achievements ?? []) : []
  const schemaByApiName = new Map<string, any>(schemaList.map((s: any) => [s.name, s]))

  const globalList =
    globalRes.status === 'fulfilled' ? (globalRes.value?.achievementpercentages?.achievements ?? []) : []
  const globalByApiName = new Map<string, number>(globalList.map((g: any) => [g.name, Number(g.percent)]))

  const achievements: AchievementDetail[] = list.map((a: any) => {
    const schema = schemaByApiName.get(a.apiname)
    return {
      apiname: a.apiname,
      displayName: schema?.displayName ?? a.apiname,
      description: schema?.description ?? '',
      icon: schema?.icon ?? '',
      iconGray: schema?.icongray ?? '',
      unlocked: a.achieved === 1,
      unlockTime: a.achieved === 1 ? a.unlocktime : null,
      globalPercent: globalByApiName.get(a.apiname) ?? null,
    }
  })

  return {
    achievements,
    achievedCount: achievements.filter((a) => a.unlocked).length,
    totalCount: achievements.length,
  }
}

/*
  Сама синхронизация — запускается без await из роута, пишет прогресс
  в progressByUser по ходу дела. Каждая игра сохраняется в БД сразу по
  готовности (не одним большим Promise.all в конце) — если пользователь
  уйдёт со страницы или сервер перезапустится на середине, то что уже
  успело обработаться, не потеряется.
*/
async function runSync(userId: string, steamId: string, apiKey: string, playedGames: SteamOwnedGame[]) {
  const progress: SyncProgress = { status: 'running', processed: 0, total: playedGames.length, gamesSynced: 0 }
  progressByUser.set(userId, progress)

  let next = 0
  async function worker() {
    while (next < playedGames.length) {
      const g = playedGames[next++]
      try {
        const result = await fetchGameAchievements(g.appid, steamId, apiKey)
        if (result) {
          await prisma.steamGameAchievements.upsert({
            where: { userId_appId: { userId, appId: g.appid } },
            create: {
              userId,
              appId: g.appid,
              gameName: g.name,
              achievements: result.achievements as unknown as Prisma.InputJsonValue,
              achievedCount: result.achievedCount,
              totalCount: result.totalCount,
            },
            update: {
              gameName: g.name,
              achievements: result.achievements as unknown as Prisma.InputJsonValue,
              achievedCount: result.achievedCount,
              totalCount: result.totalCount,
              syncedAt: new Date(),
            },
          })
          progress.gamesSynced++
        }
      } catch {
        // одна неудачная/приватная игра не должна валить всю синхронизацию
      }
      progress.processed++
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, playedGames.length) }, worker))
  progress.status = 'done'
}

router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const userId = req.userId!

    // Синк уже идёт — не запускаем второй параллельно, просто отдаём текущий статус
    const existing = progressByUser.get(userId)
    if (existing?.status === 'running') {
      res.json({ status: existing.status, total: existing.total })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.steamId || !user?.steamApiKey) {
      throw new HttpError(400, 'Укажите Steam ID и Steam API ключ в настройках профиля')
    }

    let ownedGames: SteamOwnedGame[]
    try {
      ownedGames = await fetchOwnedGames(user.steamId, user.steamApiKey)
    } catch {
      throw new HttpError(400, 'Не удалось получить библиотеку — проверьте Steam ID и API ключ')
    }

    // Никогда не запущенные игры не могут иметь достижений — не тратим на них запросы
    const playedGames = ownedGames.filter((g) => g.playtime_forever > 0)

    // Без await — синхронизация идёт в фоне, ответ отдаём сразу же
    runSync(userId, user.steamId, user.steamApiKey, playedGames).catch((err) => {
      progressByUser.set(userId, {
        status: 'error', processed: 0, total: playedGames.length, gamesSynced: 0,
        error: 'Синхронизация прервалась — попробуйте ещё раз',
      })
      console.error('Steam achievements sync failed', err)
    })

    res.json({ status: 'running', total: playedGames.length })
  })
)

router.get(
  '/sync/status',
  asyncHandler(async (req, res) => {
    const progress = progressByUser.get(req.userId!) ?? { status: 'idle', processed: 0, total: 0, gamesSynced: 0 }
    res.json(progress)
  })
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.steamGameAchievements.findMany({
      where: { userId: req.userId! },
      orderBy: { syncedAt: 'desc' },
    })
    res.json({ games: rows, lastSyncedAt: rows[0]?.syncedAt ?? null })
  })
)

export default router
