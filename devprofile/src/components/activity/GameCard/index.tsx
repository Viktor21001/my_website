/*
  GameCard — карточка игры.
  Теперь использует formatPlaytime и formatLastPlayed из useSteam.
  Визуально не изменилась — только утилиты вынесены в хук.
*/

import { formatPlaytime, formatLastPlayed } from '../../../hooks/useSteam'
import type { SteamGame } from '../../../types/steam'

interface GameCardProps {
  game: SteamGame
}

export function GameCard({ game }: GameCardProps) {
  return (
    <div
      className="flex gap-3 p-3 transition-colors duration-150 cursor-pointer"
      style={{
        background: 'var(--dp-bg-card)',
        borderBottom: '1px solid var(--dp-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--dp-bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--dp-bg-card)'
      }}
    >
      {/* Обложка игры */}
      <div
        className="shrink-0 rounded-sm overflow-hidden"
        style={{
          width: 92,
          height: 43,
          background: 'var(--dp-border)',
        }}
      >
        <img
          src={game.imgLogoUrl}
          alt={game.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      {/* Информация */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: 'var(--dp-text-primary)' }}
        >
          {game.name}
        </div>

        <div
          className="text-xs mt-0.5"
          style={{ color: 'var(--dp-text-muted)' }}
        >
          {formatPlaytime(game.playtimeForever)} всего
        </div>

        {game.lastPlayed && (
          <div
            className="text-xs"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            последний запуск {formatLastPlayed(game.lastPlayed)}
          </div>
        )}
      </div>

      {/* Время за 2 недели */}
      {game.playtime2Weeks && (
        <div className="shrink-0 text-right">
          <div
            className="text-xs font-medium"
            style={{ color: 'var(--dp-text-secondary)' }}
          >
            {formatPlaytime(game.playtime2Weeks)}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            за 2 нед.
          </div>
        </div>
      )}
    </div>
  )
}