/*
  Типы для Steam Web API.
  Документация: https://steamapi.xpaw.me/
  Получить ключ: https://steamcommunity.com/dev/apikey
*/

export interface SteamGame {
  appId: number
  name: string
  imgIconUrl: string
  imgLogoUrl: string
  playtimeForever: number  // суммарно в минутах
  playtime2Weeks?: number  // за 2 недели в минутах
  lastPlayed?: number      // unix timestamp
}

// Достижения считаются по конкретной игре — сколько получено из скольки всего
export interface GameAchievementSummary {
  appId: number
  gameName: string
  achieved: number
  total: number
  // Иконки последних полученных достижений (самые новые первыми), не больше MAX_ACHIEVEMENT_ICONS — для превью в списке
  unlockedIcons: string[]
}

/*
  Достижение с полными деталями (не только иконка) — приходит из
  собственного кэша сервера (GET /steam-achievements), а не напрямую
  из Steam Web API. См. Сервер/src/routes/steamAchievements.ts —
  форма ровно повторяет то, что там кладётся в БД как JSON.
*/
export interface SteamAchievementDetail {
  apiname: string
  displayName: string
  description: string
  icon: string
  iconGray: string
  unlocked: boolean
  unlockTime: number | null // unix timestamp, только если unlocked
  globalPercent: number | null // % всех игроков Steam, у кого есть это достижение
}

// Кэш достижений одной игры одного пользователя — одна строка SteamGameAchievements в БД
export interface SteamGameAchievementsCache {
  appId: number
  gameName: string
  achievements: SteamAchievementDetail[]
  achievedCount: number
  totalCount: number
  syncedAt: string
}

export interface SteamPlayer {
  steamId: string
  personaName: string  // никнейм в Steam
  profileUrl: string
  avatar: string       // 32x32
  avatarFull: string   // 184x184
  personaState: SteamPersonaState
  gameExtraInfo?: string  // название игры если сейчас играет
  gameId?: string
  lastLogoff?: number
}

/*
  Числовые статусы из Steam API — именно так они приходят в ответе.
  0 = офлайн, 1 = онлайн и т.д.
*/
export const SteamPersonaState = {
  Offline: 0,
  Online: 1,
  Busy: 2,
  Away: 3,
} as const

export type SteamPersonaState = (typeof SteamPersonaState)[keyof typeof SteamPersonaState]