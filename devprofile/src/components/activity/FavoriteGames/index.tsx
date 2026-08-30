/*
  FavoriteGames — теперь реальные данные из Steam API.

  Что изменилось:
  - Убрали MOCK_FAVORITES
  - Подключили useFavoriteGames() хук
  - Добавили состояния loading / error / empty
*/

import { useFavoriteGames, formatPlaytime } from '../../../hooks/useSteam'
import { useAppDispatch } from '../../../hooks/redux'
import { toggleFavoriteGamesPicker } from '../../../store/slices/uiSlice'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { PanelHeader } from '../../shared/PanelHeader'

export function FavoriteGames() {
  const dispatch = useAppDispatch()
  const { games, isLoading, isError } = useFavoriteGames()

  if (isLoading) return <SkeletonCard />
  if (isError) {
    return (
      <div className="dp-panel overflow-hidden">
        <PanelHeader title="Любимые игры" />
        <ErrorCard message="Проверь Steam ID и настройки приватности" />
      </div>
    )
  }

  return (
    <div className="dp-panel overflow-hidden">
      <PanelHeader
        title="Любимые игры"
        right={
          <button
            onClick={() => dispatch(toggleFavoriteGamesPicker())}
            title="Выбрать любимые игры"
            className="mr-3"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-secondary)', fontSize: 13 }}
          >
            👁
          </button>
        }
      />

      {games.length === 0 ? (
        <EmptyCard message="Нет данных — проверь настройки приватности Steam" />
      ) : (
        <div className="p-2 flex flex-col gap-1">
          {games.map((game) => (
            <div
              key={game.appId}
              className="flex items-center gap-2 p-1.5 rounded-sm transition-colors duration-150 cursor-pointer"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--dp-bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Обложка */}
              <div
                className="shrink-0 overflow-hidden rounded-sm"
                style={{
                  width: 60,
                  height: 28,
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

              {/* Название и время */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--dp-text-primary)' }}
                >
                  {game.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--dp-text-muted)' }}
                >
                  {formatPlaytime(game.playtimeForever)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}