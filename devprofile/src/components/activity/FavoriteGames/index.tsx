/*
  FavoriteGames — блок "Любимые игры" в правой колонке.
  Аналог блока в Steam — 4 обложки игр с наибольшим временем.
  Сейчас моковые данные, в Фазе 4 подключим Steam API.
*/

import type { SteamGame } from '../../../types/steam'

const MOCK_FAVORITES: SteamGame[] = [
  {
    appId: 220200,
    name: 'Kerbal Space Program',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/220200/header.jpg',
    playtimeForever: 3420,
  },
  {
    appId: 2054450,
    name: 'Subnautica 2',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2054450/header.jpg',
    playtimeForever: 1800,
  },
  {
    appId: 418370,
    name: 'Resident Evil 7',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/418370/header.jpg',
    playtimeForever: 120,
  },
  {
    appId: 220,
    name: 'Half-Life 2',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/220/header.jpg',
    playtimeForever: 960,
  },
]

export function FavoriteGames() {
  return (
    <div className="dp-panel overflow-hidden">
      <div className="dp-section-title">Любимые игры</div>

      <div className="p-2 flex flex-col gap-1">
        {MOCK_FAVORITES.map((game) => (
          <div
            key={game.appId}
            className="flex items-center gap-2 p-1.5 rounded transition-colors duration-150 cursor-pointer"
            style={{ borderRadius: 3 }}
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
              style={{ width: 60, height: 28, background: 'var(--dp-border)' }}
            >
              <img
                src={game.imgLogoUrl}
                alt={game.name}
                className="w-full h-full object-cover"
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
                {Math.floor(game.playtimeForever / 60)} ч.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}