/*
  GameLibrary — вся Steam-библиотека владельца плакатами (постерами),
  как в самом Steam-клиенте. Обложки — стандартный Steam CDN URL
  library_600x900.jpg по appId, отдельного API-поля для них нет.

  Ширина тайла фиксированная (не доли контейнера) — так рядность
  предсказуема и легко посчитать высоту ровно на 2 строки; всё что
  не влезло — скроллится колёсиком (overflow-y: auto).
*/

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOwnedGames, formatPlaytime } from '../../../hooks/useSteam'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { PanelHeader } from '../../shared/PanelHeader'
import type { SteamGame } from '../../../types/steam'

const POSTER_WIDTH = 100 // при ширине панели ~718px влезает ровно 6 в строку
const POSTER_HEIGHT = POSTER_WIDTH * 1.5 // постеры Steam — соотношение 2:3
const VISIBLE_ROWS = 2
const GAP = 8
const PADDING = 12

const SCROLL_AREA_HEIGHT =
  VISIBLE_ROWS * POSTER_HEIGHT + (VISIBLE_ROWS - 1) * GAP + PADDING * 2

export function GameLibrary() {
  const { games, isLoading, isError } = useOwnedGames()

  if (isLoading) return <SkeletonCard />
  if (isError) {
    return (
      <div className="dp-panel overflow-hidden">
        <PanelHeader title="Библиотека игр" />
        <ErrorCard message="Проверь настройки приватности Steam" />
      </div>
    )
  }

  return (
    <div className="dp-panel overflow-hidden">
      <PanelHeader title={<>
        Библиотека игр{' '}
        <span style={{ color: 'var(--dp-text-muted)' }}>{games.length}</span>
      </>} />

      {games.length === 0 ? (
        <EmptyCard message="Нет данных — проверь настройки приватности Steam" />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, ${POSTER_WIDTH}px)`,
            justifyContent: 'center',
            gap: GAP,
            padding: PADDING,
            maxHeight: SCROLL_AREA_HEIGHT,
            overflowY: 'auto',
          }}
        >
          {games.map((game) => (
            <PosterTile key={game.appId} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}

function PosterTile({ game }: { game: SteamGame }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer"
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        background: 'var(--dp-border)',
        borderRadius: 'var(--dp-radius-sm)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{
        scale: 1.12,
        zIndex: 5,
        boxShadow: 'var(--dp-shadow-glow)',
      }}
      transition={{ duration: 0.15 }}
    >
      <img
        src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`}
        alt={game.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />

      {hovered && (
        <motion.div
          className="absolute inset-x-0 bottom-0 px-1.5 py-1"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), transparent)' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="text-xs font-medium leading-tight"
            style={{
              color: 'var(--dp-text-white)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {game.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--dp-text-muted)' }}>
            {formatPlaytime(game.playtimeForever)}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
