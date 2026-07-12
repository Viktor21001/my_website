/*
  StatusBar — теперь подключён к Steam API.

  Логика статуса:
  1. Если Steam API вернул что пользователь в игре →  "🎮 В игре: Subnautica 2"
  2. Если Steam онлайн → "🟢 В сети"
  3. Если Steam офлайн → смотрим статус из Redux (мог быть "coding")
  4. Если Steam API недоступен → показываем статус из Redux store

  Приоритет: Steam API > Redux store.
  Когда будет Wakatime API — добавим его как третий источник.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { useSteamPlayer } from '../../../hooks/useSteam'
import { setStatus } from '../../../store/slices/profileSlice'

const STATUS_LABELS: Record<string, string> = {
  online:    '🟢 В сети',
  coding:    '💻 В редакторе',
  'in-game': '🎮 В игре',
  offline:   '⚫ Не в сети',
}

const STATUS_COLORS: Record<string, string> = {
  online:    'var(--dp-status-online)',
  coding:    'var(--dp-status-coding)',
  'in-game': 'var(--dp-status-ingame)',
  offline:   'var(--dp-status-offline)',
}

export function StatusBar() {
  const dispatch = useAppDispatch()

  // Текущий статус из Redux (может быть устаревшим)
  const { status: reduxStatus, statusText: reduxStatusText } =
    useAppSelector((state) => state.profile.user)

  // Реальный статус из Steam API
  const { status: steamStatus, statusText: steamStatusText, isError } =
    useSteamPlayer()

  /*
    useEffect — синхронизируем Steam статус с Redux store.
    Почему useEffect а не просто читаем steamStatus напрямую?
    Потому что статус хранится в Redux — другие компоненты
    (например ProfileHeader с точкой статуса) тоже его читают.
    Обновляем store один раз здесь — всё обновляется везде.
  */
  useEffect(() => {
    if (steamStatus && !isError) {
      dispatch(setStatus({
        status: steamStatus,
        statusText: steamStatusText ?? undefined,
      }))
    }
  }, [steamStatus, steamStatusText, isError, dispatch])

  /*
    Показываем статус из Redux — он уже обновлён через useEffect выше.
    Если Steam API недоступен — показываем то что было в store.
  */
  const displayStatus   = reduxStatus
  const displayStatusText = reduxStatusText

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 text-sm"
      style={{
        background: 'var(--dp-bg-panel)',
        borderBottom: '1px solid var(--dp-border)',
        color: STATUS_COLORS[displayStatus] ?? STATUS_COLORS.offline,
      }}
    >
      <span className="font-medium">
        {STATUS_LABELS[displayStatus] ?? STATUS_LABELS.offline}
      </span>

      {displayStatusText && (
        <>
          <span style={{ color: 'var(--dp-border-light)' }}>—</span>
          <span style={{ color: 'var(--dp-text-secondary)' }}>
            {displayStatusText}
          </span>
        </>
      )}
    </div>
  )
}