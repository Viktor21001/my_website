/*
  useSmartStatus — определяет статус пользователя из нескольких источников.

  Приоритеты:
  1. Steam API — если в игре, показываем название игры
  2. Steam API — если онлайн в Steam, показываем "В сети"
  3. Эвристика по времени — рабочие часы будних дней = "В редакторе"
  4. Ночное время — "Не в сети"

  В будущем сюда добавим:
  - Wakatime API — реальный статус редактора
  - WebSocket от бэкенда — статус в реальном времени
*/

import { useEffect } from 'react'
import { useAppDispatch } from './redux'
import { useSteamPlayer } from './useSteam'
import { setStatus } from '../store/slices/profileSlice'
import { SteamPersonaState } from '../types/steam'
import type { UserStatus } from '../types/profile'

interface SmartStatus {
  status: UserStatus
  statusText: string
}

/*
  Эвристика по времени — когда Steam API недоступен.
  Логика: если сейчас рабочее время будних дней —
  скорее всего пользователь за компьютером и кодит.
*/
function getTimeBasedStatus(): SmartStatus {
  const now     = new Date()
  const hour    = now.getHours()
  const weekday = now.getDay() // 0=вс, 6=сб

  const isWeekend  = weekday === 0 || weekday === 6
  const isWorkHour = hour >= 9 && hour < 23

  if (!isWeekend && isWorkHour) {
    return {
      status:     'coding',
      statusText: 'Coding in VS Code',
    }
  }

  if (hour >= 23 || hour < 6) {
    return {
      status:     'offline',
      statusText: 'Спит',
    }
  }

  return {
    status:     'online',
    statusText: '',
  }
}

/*
  Конвертируем данные Steam в наш статус.
  gameId присутствует только когда игра запущена прямо сейчас.
*/
function getSteamStatus(
  personaState: SteamPersonaState,
  gameExtraInfo?: string,
  gameId?: string
): SmartStatus | null {
  // Если сейчас в игре — высший приоритет
  if (gameId && gameExtraInfo) {
    return {
      status:     'in-game',
      statusText: `Играет в ${gameExtraInfo}`,
    }
  }

  if (personaState === SteamPersonaState.Online) {
    return {
      status:     'online',
      statusText: 'В сети',
    }
  }

  if (personaState === SteamPersonaState.Away) {
    return {
      status:     'online',
      statusText: 'Отошёл',
    }
  }

  if (personaState === SteamPersonaState.Offline) {
    return null // Не перекрываем эвристику если Steam офлайн
  }

  return null
}

export function useSmartStatus() {
  const dispatch = useAppDispatch()

  const {
    player,
    isError: steamError,
    isLoading: steamLoading,
  } = useSteamPlayer()

  useEffect(() => {
    /*
      Ждём пока Steam API ответит.
      Если грузится — не показываем промежуточный статус.
    */
    if (steamLoading) return

    let resolvedStatus: SmartStatus

    if (player && !steamError) {
      /*
        Steam API доступен — пробуем взять статус оттуда.
        Если Steam офлайн (personaState = 0) — падаем на эвристику.
      */
      const steamStatus = getSteamStatus(
        player.personaState,
        player.gameExtraInfo,
        player.gameId
      )
      resolvedStatus = steamStatus ?? getTimeBasedStatus()
    } else {
      // Steam недоступен — используем эвристику
      resolvedStatus = getTimeBasedStatus()
    }

    dispatch(setStatus({
      status:     resolvedStatus.status,
      statusText: resolvedStatus.statusText || undefined,
    }))

  }, [player, steamError, steamLoading, dispatch])

  /*
    Обновляем статус каждые 5 минут.
    Нужно для эвристики по времени — без этого статус
    не обновится если страница открыта долго.
    Для Steam статуса RTK Query сам делает рефетч.
  */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!player || steamError) {
        const timeStatus = getTimeBasedStatus()
        dispatch(setStatus({
          status:     timeStatus.status,
          statusText: timeStatus.statusText || undefined,
        }))
      }
    }, 5 * 60 * 1000) // каждые 5 минут

    return () => clearInterval(interval)
  }, [player, steamError, dispatch])
}