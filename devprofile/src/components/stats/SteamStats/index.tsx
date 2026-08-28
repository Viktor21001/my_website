/*
  SteamStats — статистика Steam в правой колонке.
  Показывает: никнейм, статус, количество игр.
  
  Аналог блока "Игры 202" в правой колонке Steam профиля.
*/

import { useSteamPlayer, useOwnedGames, useWishlistCount } from '../../../hooks/useSteam'
import { SkeletonCard } from '../../shared/Card'

const STATUS_LABELS: Record<number, string> = {
  0: '⚫ Не в сети',
  1: '🟢 В сети',
  2: '🔴 Занят',
  3: '🟡 Отошёл',
}

export function SteamStats() {
  const { player, isLoading: playerLoading } = useSteamPlayer()
  // Раньше здесь был useFavoriteGames() (топ-4) — счётчик показывал 4
  // вместо реального размера библиотеки. Нужна вся библиотека.
  const { games, isLoading: gamesLoading }   = useOwnedGames()
  const { count: wishlistCount }             = useWishlistCount()

  if (playerLoading || gamesLoading) return <SkeletonCard />

  // Если Steam не настроен — не показываем блок
  if (!player) return null

  return (
    <div className="dp-panel overflow-hidden">
      <div className="dp-section-title">Steam</div>

      <div className="p-3 flex flex-col gap-3">

        {/* Аватар Steam + никнейм */}
        <div className="flex items-center gap-2">
          <img
            src={player.avatar}
            alt={player.personaName}
            className="w-8 h-8 rounded-sm"
            style={{ border: '1px solid var(--dp-border)' }}
          />
          <div>
            <div
              className="text-xs font-medium"
              style={{ color: 'var(--dp-text-white)' }}
            >
              {player.personaName}
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              {STATUS_LABELS[player.personaState] ?? '⚫ Не в сети'}
            </div>
          </div>
        </div>

        {/* Если сейчас в игре — показываем */}
        {player.gameExtraInfo && (
          <div
            className="text-xs px-2 py-1.5 rounded"
            style={{
              background: 'var(--dp-bg-card)',
              border: '1px solid var(--dp-border)',
              color: 'var(--dp-green)',
            }}
          >
            🎮 {player.gameExtraInfo}
          </div>
        )}

        {/* Счётчик игр */}
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-semibold"
            style={{ color: 'var(--dp-text-white)' }}
          >
            {games.length}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            игр в библиотеке
          </span>
        </div>

        {/* Счётчик желаемого */}
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-semibold"
            style={{ color: 'var(--dp-text-white)' }}
          >
            {wishlistCount}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            в списке желаемого
          </span>
        </div>

        {/* Ссылка на профиль Steam */}
        <a
          href={player.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="dp-link text-xs"
        >
          Открыть в Steam →
        </a>

      </div>
    </div>
  )
}