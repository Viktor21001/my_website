/*
  StatusBar — строка статуса под шапкой.
  Показывает что сейчас делает пользователь:
  "В сети" / "Сейчас играет в Subnautica 2" / "Пишет код в VS Code"
  
  Аналог зелёной строки в Steam профиле.
*/

import { useAppSelector } from '../../../hooks/redux'

// Человекочитаемые названия статусов
const STATUS_LABELS: Record<string, string> = {
  online:   '🟢 В сети',
  coding:   '💻 В редакторе',
  'in-game': '🎮 В игре',
  offline:  '⚫ Не в сети',
}

const STATUS_COLORS: Record<string, string> = {
  online:   'var(--dp-status-online)',
  coding:   'var(--dp-status-coding)',
  'in-game': 'var(--dp-status-ingame)',
  offline:  'var(--dp-status-offline)',
}

export function StatusBar() {
  const { status, statusText } = useAppSelector((state) => state.profile.user)

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 text-sm"
      style={{
        background: 'var(--dp-bg-panel)',
        borderBottom: '1px solid var(--dp-border)',
        color: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
      }}
    >
      {/* Основной статус */}
      <span className="font-medium">
        {STATUS_LABELS[status] ?? STATUS_LABELS.offline}
      </span>

      {/* Уточнение статуса — "Playing Subnautica 2" / "Coding in VS Code" */}
      {statusText && (
        <>
          <span style={{ color: 'var(--dp-border-light)' }}>—</span>
          <span style={{ color: 'var(--dp-text-secondary)' }}>
            {statusText}
          </span>
        </>
      )}
    </div>
  )
}