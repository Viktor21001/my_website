/*
  SteamAchievements — "Недавняя активность" в стиле профиля Steam:
  недавно сыгранные игры (не любимые — это отдельный, вручную выбранный
  список на Dev-вкладке) с прогрессом по достижениям под каждой игрой.

  Steam Web API не даёт единый метод "достижения по всем играм", поэтому
  список игр и сами достижения запрашиваются по одному эндпоинту на игру
  (см. useRecentGamesAchievements) — здесь просто сводим их вместе.
*/

import { motion } from 'framer-motion'
import { useRecentGames, useRecentGamesAchievements, formatPlaytime, formatLastPlayed } from '../../../hooks/useSteam'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { SkeletonCard } from '../../shared/Card'
import { PanelHeader } from '../../shared/PanelHeader'

export function SteamAchievements() {
  const { games, isLoading: gamesLoading } = useRecentGames()
  const { achievements } = useRecentGamesAchievements()

  if (gamesLoading) return <SkeletonCard />
  if (games.length === 0) return null // Steam не настроен либо нет активности за 2 недели

  const totalMinutes2Weeks = games.reduce((sum, g) => sum + (g.playtime2Weeks ?? 0), 0)

  return (
    <motion.div className="dp-panel overflow-hidden" variants={staggerItemVariants}>
      <PanelHeader
        title="Недавняя активность"
        right={totalMinutes2Weeks > 0 && (
          <span className="text-xs mr-3" style={{ color: 'var(--dp-text-muted)' }}>
            {formatPlaytime(totalMinutes2Weeks)} за последние 2 недели
          </span>
        )}
      />

      <div className="flex flex-col">
        {games.map((game) => {
          const gameAchievements = achievements.find((a) => a.appId === game.appId)
          const percent = gameAchievements && gameAchievements.total > 0
            ? Math.round((gameAchievements.achieved / gameAchievements.total) * 100)
            : 0
          const hiddenAchievedCount = gameAchievements
            ? gameAchievements.achieved - gameAchievements.unlockedIcons.length
            : 0

          return (
            <div key={game.appId} className="p-3" style={{ borderBottom: '1px solid var(--dp-border)' }}>
              <div className="flex gap-3">
                <div
                  className="shrink-0 overflow-hidden rounded"
                  style={{ width: 92, height: 43, background: 'var(--dp-border)', borderRadius: 'var(--dp-radius-sm)' }}
                >
                  <img
                    src={game.imgLogoUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--dp-text-primary)' }}>
                    {game.name}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs font-mono font-medium" style={{ color: 'var(--dp-text-code)' }}>
                    {formatPlaytime(game.playtimeForever)} всего
                  </div>
                  {game.lastPlayed && (
                    <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                      последний запуск {formatLastPlayed(game.lastPlayed)}
                    </div>
                  )}
                </div>
              </div>

              {gameAchievements && gameAchievements.total > 0 && (
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="text-xs shrink-0" style={{ color: 'var(--dp-text-secondary)' }}>
                    Достижения
                  </span>
                  <span className="text-xs shrink-0 font-mono" style={{ color: 'var(--dp-text-code)' }}>
                    {gameAchievements.achieved} из {gameAchievements.total}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dp-border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, background: 'var(--dp-accent)' }}
                    />
                  </div>
                  {gameAchievements.unlockedIcons.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {gameAchievements.unlockedIcons.map((icon, i) => (
                        <img
                          key={i}
                          src={icon}
                          alt=""
                          className="rounded-sm"
                          style={{ width: 24, height: 24, background: 'var(--dp-border)' }}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ))}
                      {hiddenAchievedCount > 0 && (
                        <span
                          className="text-xs flex items-center justify-center rounded-sm shrink-0"
                          style={{ width: 24, height: 24, background: 'var(--dp-bg-card)', color: 'var(--dp-text-muted)' }}
                        >
                          +{hiddenAchievedCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
