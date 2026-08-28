/*
  useSteam — единая точка входа для всех Steam данных.
  Такой же подход как useGithub — компоненты не знают
  откуда пришли данные и какой API используется.

  Steam ID берём из аккаунта (state.auth.user.steamId), настраивается
  в Настройках профиля. Раньше был фолбэк на .env VITE_STEAM_ID — убрали:
  в мультипользовательском режиме показывать личный Steam владельца
  сайта дефолтом для чужого нового аккаунта неверно.
*/

import { useAppSelector } from './redux'
import {
  useGetSteamPlayerQuery,
  useGetRecentGamesQuery,
  useGetOwnedGamesQuery,
  useGetWishlistCountQuery,
  useGetFavoriteGamesAchievementsQuery,
} from '../store/api/steamApi'
import { SteamPersonaState } from '../types/steam'
import type { SteamGame } from '../types/steam'
import type { UserStatus } from '../types/profile'

const DEFAULT_FAVORITES_COUNT = 4

function useSteamId(): string {
  return useAppSelector((state) => state.auth.user?.steamId ?? '')
}

/*
  Разбирает то, что пользователь мог вписать в поле Steam в Настройках:
  готовый SteamID64, ссылку на профиль (/profiles/<id> или /id/<vanity>)
  или просто логин. Возвращает либо уже готовый id, либо vanity-имя,
  которое ещё нужно резолвить через ResolveVanityURL.
*/
export function parseSteamInput(input: string): { kind: 'id'; value: string } | { kind: 'vanity'; value: string } {
  const trimmed = input.trim().replace(/\/+$/, '')

  const profilesMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (profilesMatch) return { kind: 'id', value: profilesMatch[1] }

  const idUrlMatch = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/)
  if (idUrlMatch) return { kind: 'vanity', value: idUrlMatch[1] }

  if (/^\d{17}$/.test(trimmed)) return { kind: 'id', value: trimmed }

  return { kind: 'vanity', value: trimmed }
}

// Статус Steam → наш UserStatus
function steamStateToUserStatus(
  state: SteamPersonaState,
  gameId?: string
): UserStatus {
  /*
    Если gameId есть — значит пользователь сейчас в игре.
    Steam отдаёт gameId только когда игра запущена.
  */
  if (gameId) return 'in-game'
  if (state === SteamPersonaState.Offline) return 'offline'
  return 'online'
}

// Хук данных игрока (статус, никнейм, аватар)
export function useSteamPlayer() {
  const steamId = useSteamId()

  const {
    data: player,
    isLoading,
    isError,
  } = useGetSteamPlayerQuery(steamId, { skip: !steamId })

  /*
    Вычисляем статус из данных Steam.
    Это нужно чтобы обновить StatusBar —
    "В игре: Subnautica 2" вместо просто "В сети".
  */
  const status = player
    ? steamStateToUserStatus(player.personaState, player.gameId)
    : null

  const statusText = player?.gameExtraInfo
    ? `Играет в ${player.gameExtraInfo}`
    : null

  return { player, status, statusText, isLoading, isError, steamId }
}

// Хук последних сыгранных игр
export function useRecentGames() {
  const steamId = useSteamId()

  const {
    data: games = [],
    isLoading,
    isError,
  } = useGetRecentGamesQuery(steamId, { skip: !steamId })

  /*
    Форматируем время для отображения.
    Steam хранит время в минутах — переводим в часы.
  */
  const gamesWithTime = games.map((game) => ({
    ...game,
    hoursTotal: Math.floor(game.playtimeForever / 60),
    hours2Weeks: game.playtime2Weeks
      ? Math.floor(game.playtime2Weeks / 60)
      : null,
  }))

  return { games: gamesWithTime, isLoading, isError }
}

// Хук всей библиотеки игрока — для реального счётчика и пикера любимых игр
export function useOwnedGames() {
  const steamId = useSteamId()

  const {
    data: games = [],
    isLoading,
    isError,
  } = useGetOwnedGamesQuery(steamId, { skip: !steamId })

  return { games, isLoading, isError }
}

/*
  Хук счётчика желаемого. Официального метода в документации Steam Web
  API нет, но IWishlistService/GetWishlist давно используется как
  стабильный недокументированный эндпоинт (см. SteamDB и подобные
  сайты) — работает без ключа, отдаёт ровно то, что видно в разделе
  "Желаемое" на community-профиле.
*/
export function useWishlistCount() {
  const steamId = useSteamId()

  const {
    data: count = 0,
    isLoading,
    isError,
  } = useGetWishlistCountQuery(steamId, { skip: !steamId })

  return { count, isLoading, isError }
}

/*
  Хук любимых игр. Если пользователь сам выбрал их в пикере
  (state.auth.user.favoriteSteamAppIds) — показываем именно их, в том
  порядке, в котором он их выбирал. Если ещё не выбирал — фолбэк на
  старое поведение: топ-N по наработанному времени.
*/
export function useFavoriteGames() {
  const favoriteAppIds = useAppSelector((state) => state.auth.user?.favoriteSteamAppIds ?? [])
  const { games: allGames, isLoading, isError } = useOwnedGames()

  const games: SteamGame[] =
    favoriteAppIds.length > 0
      ? favoriteAppIds
          .map((id) => allGames.find((g) => g.appId === id))
          .filter((g): g is SteamGame => g !== undefined)
      : allGames.slice(0, DEFAULT_FAVORITES_COUNT)

  return { games, allGames, isLoading, isError }
}

// Хук достижений по любимым играм (топ-4 по времени)
export function useFavoriteGamesAchievements() {
  const steamId = useSteamId()
  const { games } = useFavoriteGames()

  const gameRefs = games.map((g) => ({ appId: g.appId, name: g.name }))

  const {
    data: achievements = [],
    isLoading,
    isError,
  } = useGetFavoriteGamesAchievementsQuery(
    { steamId, games: gameRefs },
    { skip: !steamId || gameRefs.length === 0 }
  )

  return { achievements, isLoading, isError }
}

// Утилита: минуты → "Xч Yмин" или "Xч"
export function formatPlaytime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч.`
  return `${h} ч. ${m} мин`
}

// Утилита: unix timestamp → "9 июн"
export function formatLastPlayed(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}