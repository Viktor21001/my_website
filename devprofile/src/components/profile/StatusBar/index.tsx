import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { useSteamPlayer } from '../../../hooks/useSteam'
import { setStatus } from '../../../store/slices/profileSlice'
import { SteamPersonaState } from '../../../types/steam'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  online:    { label: 'В сети',       color: 'var(--dp-status-online)',  dot: '#57cbde' },
  coding:    { label: 'В редакторе',  color: 'var(--dp-status-coding)',  dot: '#8bc34a' },
  'in-game': { label: 'В игре',       color: 'var(--dp-status-ingame)',  dot: '#a4c639' },
  offline:   { label: 'Не в сети',    color: 'var(--dp-status-offline)', dot: '#4a6070' },
}

export function StatusBar() {
  const dispatch = useAppDispatch()
  const { status, statusText } = useAppSelector((state) => state.profile)
  const { player, isError } = useSteamPlayer()

  useEffect(() => {
    if (!player || isError) return
    let newStatus: typeof status = 'online'
    let newText: string | undefined

    if (player.gameId && player.gameExtraInfo) {
      newStatus = 'in-game'
      newText   = `Играет в ${player.gameExtraInfo}`
    } else if (player.personaState === SteamPersonaState.Offline) {
      newStatus = 'offline'
    }

    dispatch(setStatus({ status: newStatus, statusText: newText }))
  }, [player, isError, dispatch])

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 text-xs"
      style={{
        background:   'rgba(0,0,0,0.25)',
        borderBottom: '1px solid var(--dp-border)',
      }}
    >
      {/* Цветная точка */}
      <div
        className="w-2 h-2 rounded-full shrink-0 dp-status-pulse"
        style={{ background: config.dot }}
      />

      {/* Статус */}
      <span className="font-medium" style={{ color: config.color }}>
        {config.label}
      </span>

      {/* Уточнение */}
      {statusText && (
        <>
          <span style={{ color: 'var(--dp-border-light)' }}>·</span>
          <span
            className="truncate font-mono text-xs"
            style={{ color: 'var(--dp-text-code)' }}
          >
            {statusText}
          </span>
        </>
      )}
    </div>
  )
}