/*
  AchievementsLibrary — все полученные достижения по всей Steam-библиотеке,
  квадратиками, как в самом Steam. Источник — собственный кэш сервера
  (useAchievementsLibrary → GET/POST /steam-achievements), а не прямой
  запрос к Steam: библиотека может быть 200+ игр, и получать достижения
  по всем сразу на каждую загрузку страницы нельзя (см. комментарий в
  Сервер/src/routes/steamAchievements.ts).

  Три состояния:
  - нет личного Steam API ключа — блок притушен, с пояснением и «?»
    (используем общий VITE_STEAM_API_KEY только для остальных Steam-панелей,
    для полной синхронизации библиотеки нужен ключ самого пользователя —
    см. SettingsPanel/ConnectedAccountsSection)
  - ключ есть, но синхронизации ещё не было — кнопка «Синхронизировать»
  - есть кэш — сетка квадратиков, скроллится после нескольких строк
*/

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { useAchievementsLibrary } from '../../../hooks/useSteam'
import { useTooltipPosition } from '../../../hooks/useTooltipPosition'
import { tooltipVariants } from '../../../hooks/useAnimatedMount'
import { HelpTooltipIcon } from '../../shared/HelpTooltipIcon'
import { STEAM_API_KEY_HELP_SECTIONS } from '../../../config/steamHelp'
import type { SteamAchievementDetail } from '../../../types/steam'

const TILE = 40
const GAP = 6
const PADDING = 12
const VISIBLE_ROWS = 4
const SCROLL_AREA_HEIGHT = VISIBLE_ROWS * TILE + (VISIBLE_ROWS - 1) * GAP + PADDING * 2
const TOOLTIP_WIDTH = 260

/*
  Каждый тайл — это отдельный компонент с собственным useTooltipPosition
  (ref + state под портал-тултип). На большой прожитой библиотеке
  суммарно полученных ачивок по всем играм легко набирается несколько
  тысяч — смонтировать их все разом ровно в момент переключения на
  вкладку Games (до этого вкладка не рендерилась вообще) было тем самым
  "зависанием": один синхронный React-коммит на тысячи компонентов с
  hover-логикой блокирует основной поток на секунды. Поэтому рендерим
  только первые INITIAL_VISIBLE, а остальные — по кнопке «Показать ещё»
  батчами по LOAD_MORE_STEP, а не сразу все.
*/
const INITIAL_VISIBLE = 200
const LOAD_MORE_STEP = 200

interface FlatAchievement extends SteamAchievementDetail {
  gameName: string
}

function formatUnlockDateTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const datePart = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  const timePart = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

export function AchievementsLibrary() {
  const user = useAppSelector((state) => state.auth.user)
  const { games, lastSyncedAt, isLoading, isError, sync, isSyncing, syncError, syncProgress } = useAchievementsLibrary()
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  // До ранних return'ов ниже — хуки должны вызываться безусловно на каждом рендере
  const allAchievements: FlatAchievement[] = useMemo(
    () =>
      games
        .flatMap((g) => g.achievements.filter((a) => a.unlocked).map((a) => ({ ...a, gameName: g.gameName })))
        .sort((a, b) => (b.unlockTime ?? 0) - (a.unlockTime ?? 0)),
    [games]
  )

  if (!user?.hasSteamApiKey) {
    return (
      <div className="dp-panel overflow-hidden">
        <div className="dp-section-title">Достижения</div>
        <div
          className="flex flex-col items-center text-center gap-2 px-6 py-7"
          style={{ opacity: 0.55 }}
        >
          <span style={{ fontSize: 22 }}>🏆</span>
          <div className="text-xs" style={{ color: 'var(--dp-text-secondary)', maxWidth: 260 }}>
            Достижения по всей библиотеке — покажет все ачивки, полученные во всех играх.
            Чтобы включить блок, добавьте свой Steam API ключ в настройках профиля.
          </div>
          <HelpTooltipIcon sections={STEAM_API_KEY_HELP_SECTIONS} portalKey="achievements-activate-help" placement="inline" />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="dp-panel overflow-hidden">
        <div className="dp-section-title">Достижения</div>
        <div className="p-4 text-xs" style={{ color: 'var(--dp-text-muted)' }}>Загрузка…</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="dp-panel overflow-hidden">
        <div className="dp-section-title">Достижения</div>
        <div className="p-4 text-xs" style={{ color: 'var(--dp-orange)' }}>Не удалось загрузить достижения</div>
      </div>
    )
  }

  async function handleSync() {
    try {
      await sync()
    } catch {
      // ошибка уже отражена через syncError ниже
    }
  }

  if (games.length === 0) {
    return (
      <div className="dp-panel overflow-hidden">
        <div className="dp-section-title">Достижения</div>
        <div className="flex flex-col items-center text-center gap-2 px-6 py-6">
          <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
            Ещё не синхронизировано — на большую библиотеку может уйти минута-другая.
          </div>
          <button onClick={handleSync} disabled={isSyncing} className="dp-btn-primary text-xs">
            {isSyncing ? 'Синхронизация…' : '🔄 Синхронизировать достижения'}
          </button>
          {isSyncing && syncProgress && (
            <div className="w-full flex flex-col items-center gap-1 mt-1">
              <SyncProgressBar processed={syncProgress.processed} total={syncProgress.total} />
              <span className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                {syncProgress.processed} из {syncProgress.total} игр
              </span>
            </div>
          )}
          {syncError && <div className="dp-error">{syncError}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="dp-panel overflow-hidden">
      <div
        className="flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--dp-border)' }}
      >
        <span className="dp-section-title" style={{ border: 'none', background: 'none' }}>
          Достижения{' '}
          <span style={{ color: 'var(--dp-text-muted)' }}>{allAchievements.length}</span>
        </span>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title={lastSyncedAt ? `Обновлено ${new Date(lastSyncedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Синхронизировать'}
          className="mr-3"
          style={{ background: 'none', border: 'none', cursor: isSyncing ? 'default' : 'pointer', color: 'var(--dp-text-secondary)', fontSize: 13 }}
        >
          {isSyncing ? '…' : '🔄'}
        </button>
      </div>

      {isSyncing && syncProgress && (
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--dp-border)' }}>
          <SyncProgressBar processed={syncProgress.processed} total={syncProgress.total} />
          <span className="text-xs font-mono shrink-0" style={{ color: 'var(--dp-text-muted)' }}>
            {syncProgress.processed}/{syncProgress.total}
          </span>
        </div>
      )}

      {syncError && <div className="dp-error px-3 pt-2">{syncError}</div>}

      {allAchievements.length === 0 ? (
        <div className="p-4 text-xs text-center" style={{ color: 'var(--dp-text-muted)' }}>
          Пока нет ни одного полученного достижения
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, ${TILE}px)`,
              justifyContent: 'center',
              gap: GAP,
              padding: PADDING,
              maxHeight: SCROLL_AREA_HEIGHT,
              overflowY: 'auto',
            }}
          >
            {allAchievements.slice(0, visibleCount).map((a, i) => (
              <AchievementTile key={`${a.gameName}-${a.apiname}-${i}`} achievement={a} />
            ))}
          </div>
          {visibleCount < allAchievements.length && (
            <button
              onClick={() => setVisibleCount((n) => n + LOAD_MORE_STEP)}
              className="w-full text-xs py-2"
              style={{ background: 'none', border: 'none', borderTop: '1px solid var(--dp-border)', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
            >
              Показать ещё ({allAchievements.length - visibleCount})
            </button>
          )}
        </>
      )}
    </div>
  )
}

function SyncProgressBar({ processed, total }: { processed: number; total: number }) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0
  return (
    <div className="flex-1 flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dp-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--dp-accent)' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--dp-text-code)' }}>{percent}%</span>
    </div>
  )
}

function AchievementTile({ achievement }: { achievement: FlatAchievement }) {
  const [hovered, setHovered] = useState(false)
  const { triggerRef, position, show } = useTooltipPosition<HTMLDivElement>(TOOLTIP_WIDTH)

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => { setHovered(true); show() }}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="overflow-hidden cursor-pointer"
        style={{
          width: TILE,
          height: TILE,
          background: 'var(--dp-border)',
          borderRadius: 'var(--dp-radius-sm)',
        }}
        whileHover={{ scale: 1.15, zIndex: 5, boxShadow: 'var(--dp-shadow-glow)' }}
        transition={{ duration: 0.15 }}
      >
        <img
          src={achievement.icon}
          alt={achievement.displayName}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </motion.div>

      {hovered && position && createPortal(
        <motion.div
          className="fixed z-50 p-3 rounded pointer-events-none flex gap-3"
          style={{
            bottom: position.bottom,
            left:   position.left,
            width:  TOOLTIP_WIDTH,
            background:  'var(--dp-bg-panel)',
            border:      '1px solid var(--dp-border-accent)',
            boxShadow:   'var(--dp-shadow-lg)',
            borderRadius: 'var(--dp-radius-md)',
          }}
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 40, height: 40, background: 'var(--dp-bg-card)', borderRadius: 'var(--dp-radius-sm)' }}
          >
            <img src={achievement.icon} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold" style={{ color: 'var(--dp-accent-bright)' }}>
              {achievement.displayName}
            </div>
            <div className="text-xs mb-1 truncate" style={{ color: 'var(--dp-text-muted)' }}>
              {achievement.gameName}
            </div>
            {achievement.description && (
              <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
                {achievement.description}
              </div>
            )}
            <div
              className="text-xs mt-2 pt-2 font-mono"
              style={{ color: 'var(--dp-green)', borderTop: '1px solid var(--dp-border)' }}
            >
              {achievement.unlockTime ? `Получено ${formatUnlockDateTime(achievement.unlockTime)}` : 'Получено'}
            </div>
            {achievement.globalPercent != null && (
              <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                Это достижение есть у {achievement.globalPercent.toFixed(1)}% игроков
              </div>
            )}
          </div>
        </motion.div>,
        document.body,
        'achievement-tile-tooltip'
      )}
    </div>
  )
}
