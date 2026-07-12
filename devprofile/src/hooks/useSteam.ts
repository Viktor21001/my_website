/*
  useSteam — единая точка входа для всех Steam данных.
  Такой же подход как useGithub — компоненты не знают
  откуда пришли данные и какой API используется.

  Steam ID берём из двух мест:
  1. Redux store (user.socialLinks.steam) — когда придёт бэкенд
  2. .env переменная VITE_STEAM_ID — для текущего мока

  Почему из двух мест?
  Сейчас у нас один пользователь — мы сами.
  Когда сделаем платформу — каждый пользователь будет
  хранить свой Steam ID в профиле на бэкенде.
*/

import { useAppSelector } from './redux'
import {
  useGetSteamPlayerQuery,
  useGetRecentGamesQuery,
  useGetFavoriteGamesQuery,
} from '../store/api/steamApi'
import { SteamPersonaState } from '../types/steam'
import type { UserStatus } from '../types/profile'

// Берём Steam ID из store или из .env
function useSteamId(): string {
  const steamIdFromStore = useAppSelector(
    (state) => state.profile.user.socialLinks.steam
  )
  /*
    ?? — оператор nullish coalescing.
    Берём из store если есть, иначе из .env.
    Так в будущем достаточно сохранить Steam ID в профиле —
    и всё заработает без изменений в коде.
  */
  return steamIdFromStore ?? (import.meta.env.VITE_STEAM_ID as string) ?? ''
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

// Хук любимых игр (топ по времени)
export function useFavoriteGames() {
  const steamId = useSteamId()

  const {
    data: games = [],
    isLoading,
    isError,
  } = useGetFavoriteGamesQuery(steamId, { skip: !steamId })

  return { games, isLoading, isError }
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