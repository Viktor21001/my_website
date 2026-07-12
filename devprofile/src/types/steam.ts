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