/*
  SteamAchievements — достижения по любимым играм (топ-4 по времени).
  Steam Web API не даёt единый метод "достижения по всем играм", поэтому
  список игр и сами достижения запрашиваются по одному эндпоинту на игру
  (см. useFavoriteGamesAchievements) — здесь просто сводим их вместе для
  отображения.
*/

import { motion } from 'framer-motion'
import { useFavoriteGames, useFavoriteGamesAchievements } from '../../../hooks/useSteam'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { SkeletonCard, EmptyCard } from '../../shared/Card'

export function SteamAchievements() {
  const { games, isLoading: gamesLoading } = useFavoriteGames()
  const { achievements, isLoading: achievementsLoading } = useFavoriteGamesAchievements()

  if (gamesLoading || achievementsLoading) return <SkeletonCard />
  if (games.length === 0) return null // Steam не настроен

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">Игры и достижения</div>

      {achievements.length === 0 ? (
        <EmptyCard message="Нет данных о достижениях — у любимых игр их нет либо профиль приватный" />
      ) : (
        <div className="flex flex-col">
          {achievements.map((a) => {
            const game = games.find((g) => g.appId === a.appId)
            const percent = a.total > 0 ? Math.round((a.achieved / a.total) * 100) : 0

            return (
              <div
                key={a.appId}
                className="flex items-center gap-3 p-3"
                style={{ borderBottom: '1px solid var(--dp-border)' }}
              >
                <div
                  className="shrink-0 rounded overflow-hidden"
                  style={{ width: 46, height: 46, background: 'var(--dp-border)', borderRadius: 'var(--dp-radius-sm)' }}
                >
                  {game && (
                    <img
                      src={game.imgIconUrl}
                      alt={a.gameName}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--dp-text-primary)' }}>
                    {a.gameName}
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden mt-1.5"
                    style={{ background: 'var(--dp-border)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, background: 'var(--dp-accent)' }}
                    />
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs font-mono font-medium" style={{ color: 'var(--dp-text-code)' }}>
                    {a.achieved}/{a.total}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>{percent}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
