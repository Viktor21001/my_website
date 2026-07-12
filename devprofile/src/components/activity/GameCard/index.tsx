import { motion } from 'framer-motion'
import { formatPlaytime, formatLastPlayed } from '../../../hooks/useSteam'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import type { SteamGame } from '../../../types/steam'

export function GameCard({ game }: { game: SteamGame }) {
  return (
    <motion.div
      className="flex gap-3 p-3 cursor-pointer"
      style={{
        background:   'var(--dp-bg-card)',
        borderBottom: '1px solid var(--dp-border)',
      }}
      variants={staggerItemVariants}
      whileHover={{ backgroundColor: 'var(--dp-bg-card-hover)' }}
    >
      {/* Обложка */}
      <div
        className="shrink-0 rounded overflow-hidden"
        style={{
          width:      92,
          height:     43,
          background: 'var(--dp-border)',
          borderRadius: 'var(--dp-radius-sm)',
        }}
      >
        <img
          src={game.imgLogoUrl}
          alt={game.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: 'var(--dp-text-primary)' }}
        >
          {game.name}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--dp-text-muted)' }}>
          {formatPlaytime(game.playtimeForever)} всего
        </div>
        {game.lastPlayed && (
          <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
            последний запуск {formatLastPlayed(game.lastPlayed)}
          </div>
        )}
      </div>

      {/* Время за 2 недели */}
      {game.playtime2Weeks && (
        <div className="shrink-0 text-right">
          <div
            className="text-xs font-mono font-medium"
            style={{ color: 'var(--dp-text-code)' }}
          >
            {formatPlaytime(game.playtime2Weeks)}
          </div>
          <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
            за 2 нед.
          </div>
        </div>
      )}
    </motion.div>
  )
}