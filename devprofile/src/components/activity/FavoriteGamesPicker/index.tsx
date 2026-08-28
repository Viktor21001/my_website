/*
  FavoriteGamesPicker — выбор любимых игр из полной библиотеки Steam
  (до 7 штук). Тот же shell/анимация, что у SettingsPanel — тот же
  bottom-sheet и то же решение с историей браузера (useModalHistoryClose),
  чтобы "назад"/Esc/✕ закрывали именно панель, не уводя со страницы.
*/

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setFavoriteGamesPickerOpen } from '../../../store/slices/uiSlice'
import { useModalHistoryClose } from '../../../hooks/useModalHistoryClose'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { useOwnedGames, formatPlaytime } from '../../../hooks/useSteam'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { extractApiError } from '../../../utils/apiError'
import { SkeletonCard, EmptyCard } from '../../shared/Card'

const MAX_FAVORITES = 7

export function FavoriteGamesPicker() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.ui.isFavoriteGamesPickerOpen)
  const user = useAppSelector((state) => state.auth.user)

  const onClose = () => dispatch(setFavoriteGamesPickerOpen(false))
  const close = useModalHistoryClose(isOpen, onClose, 'favorite-games-picker')

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              background: 'var(--dp-bg-panel)',
              borderTop: '1px solid var(--dp-border-accent)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
              maxHeight: '85vh',
              borderRadius: '12px 12px 0 0',
            }}
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--dp-border-light)' }} />
            </div>

            <div
              className="flex items-center justify-between px-5 py-3 sticky top-0"
              style={{ background: 'var(--dp-bg-panel)', borderBottom: '1px solid var(--dp-border)' }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--dp-text-white)' }}>
                Любимые игры
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{
                  background: 'var(--dp-bg-card)',
                  border: '1px solid var(--dp-border)',
                  color: 'var(--dp-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            <PickerBody favoriteSteamAppIds={user.favoriteSteamAppIds} onSaved={close} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function PickerBody({
  favoriteSteamAppIds,
  onSaved,
}: {
  favoriteSteamAppIds: number[]
  onSaved: () => void
}) {
  const { games, isLoading, isError } = useOwnedGames()
  const [selected, setSelected] = useState<number[]>(favoriteSteamAppIds)
  const [filter, setFilter] = useState('')
  const [updateProfile, { isLoading: isSaving, error }] = useUpdateProfile()

  const filteredGames = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return games
    return games.filter((g) => g.name.toLowerCase().includes(q))
  }, [games, filter])

  function toggle(appId: number) {
    setSelected((prev) => {
      if (prev.includes(appId)) return prev.filter((id) => id !== appId)
      if (prev.length >= MAX_FAVORITES) return prev
      return [...prev, appId]
    })
  }

  async function save() {
    try {
      await updateProfile({ favoriteSteamAppIds: selected })
      onSaved()
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  if (isLoading) return <div className="p-5"><SkeletonCard /></div>
  if (isError || games.length === 0) {
    return <div className="p-5"><EmptyCard message="Нет данных о библиотеке — проверь Steam ID и настройки приватности" /></div>
  }

  return (
    <div className="p-5 flex flex-col gap-3">
      <input
        type="text"
        placeholder="Поиск по библиотеке…"
        className="dp-input"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
        Выбрано: <span style={{ color: 'var(--dp-text-white)' }}>{selected.length}</span> / {MAX_FAVORITES}
      </div>

      <div className="flex flex-col gap-1" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {filteredGames.length === 0 ? (
          <EmptyCard message="Ничего не найдено" />
        ) : (
          filteredGames.map((game) => {
            const isSelected = selected.includes(game.appId)
            const isDisabled = !isSelected && selected.length >= MAX_FAVORITES

            return (
              <button
                key={game.appId}
                onClick={() => toggle(game.appId)}
                disabled={isDisabled}
                className="flex items-center gap-2 p-1.5 rounded-sm text-left"
                style={{
                  background: isSelected ? 'var(--dp-bg-card-hover)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--dp-border-accent)' : 'transparent'}`,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                }}
              >
                <div
                  className="shrink-0 overflow-hidden rounded-sm"
                  style={{ width: 60, height: 28, background: 'var(--dp-border)' }}
                >
                  <img
                    src={game.imgLogoUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: 'var(--dp-text-primary)' }}>
                    {game.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                    {formatPlaytime(game.playtimeForever)}
                  </div>
                </div>

                {isSelected && (
                  <span className="shrink-0 text-xs" style={{ color: 'var(--dp-accent-bright)' }}>✓</span>
                )}
              </button>
            )
          })
        )}
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить')}</div>}

      <button onClick={save} className="dp-btn-primary text-xs self-start" disabled={isSaving}>
        {isSaving ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  )
}
