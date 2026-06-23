/*
  ProfileHeader — самый верхний блок профиля.
  Визуально повторяет шапку Steam профиля:
  
  ┌──────────────────────────────────────────────┐
  │  [АВАТАР]  Yeliseyev              Уровень 18 │
  │            Viktor                  ████░ XP  │
  │            Yamal-Nenets, Russia              │
  │            [GitHub] [Steam]                  │
  └──────────────────────────────────────────────┘
  
  Данные берём из Redux store через useAppSelector.
  Компонент ничего не знает откуда пришли данные —
  это правильно, завтра они придут с бэкенда.
*/

import { useAppSelector } from '../../../hooks/redux'
import { xpProgressPercent } from '../../../config/constants'

export function ProfileHeader() {
  // Берём пользователя из Redux store
  const user = useAppSelector((state) => state.profile.user)

  return (
    <div
      className="relative p-4 flex items-end gap-4"
      style={{
        background: 'linear-gradient(to bottom, rgba(27,40,56,0.3) 0%, var(--dp-bg-page) 100%)',
        borderBottom: '1px solid var(--dp-border)',
        minHeight: '120px',
      }}
    >
      {/* Аватар */}
      <div
        className="relative shrink-0"
        style={{
          width: 84,
          height: 84,
          border: '2px solid var(--dp-border-light)',
        }}
      >
        <img
          src={user.avatar}
          alt={user.displayName}
          className="w-full h-full object-cover"
        />

        {/* Индикатор статуса — кружок в углу аватара как в Steam */}
        <StatusDot status={user.status} />
      </div>

      {/* Основная информация */}
      <div className="flex-1 min-w-0 pb-1">

        {/* Ник */}
        <h1
          className="text-xl font-semibold leading-tight truncate"
          style={{ color: 'var(--dp-text-white)' }}
        >
          {user.displayName}
        </h1>

        {/* Настоящее имя и локация — как в Steam */}
        {user.location && (
          <div
            className="text-xs mt-0.5 flex items-center gap-1"
            style={{ color: 'var(--dp-text-secondary)' }}
          >
            <span>📍</span>
            <span>{user.location}</span>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <p
            className="text-xs mt-1 truncate"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            {user.bio}
          </p>
        )}

        {/* Ссылки на соцсети */}
        <div className="flex gap-3 mt-2">
          {user.socialLinks.github && (
            <a
              href={`https://github.com/${user.socialLinks.github}`}
              target="_blank"
              rel="noreferrer"
              className="dp-link text-xs"
            >
              GitHub
            </a>
          )}
          {user.socialLinks.steam && (
            <a
              href={`https://steamcommunity.com/profiles/${user.socialLinks.steam}`}
              target="_blank"
              rel="noreferrer"
              className="dp-link text-xs"
            >
              Steam
            </a>
          )}
          {user.socialLinks.website && (
            <a
              href={user.socialLinks.website}
              target="_blank"
              rel="noreferrer"
              className="dp-link text-xs"
            >
              Сайт
            </a>
          )}
        </div>
      </div>

      {/* Уровень и XP — правый край шапки */}
      <div className="shrink-0 pb-1 text-right">
        <div className="flex items-center gap-2 justify-end">
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--dp-text-secondary)' }}
          >
            Уровень
          </span>
          {/* Бейдж уровня как в Steam */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: 'var(--dp-accent)',
              color: '#000',
            }}
          >
            {user.level}
          </div>
        </div>

        {/* XP прогресс-бар */}
        <div className="mt-2 w-32">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--dp-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${xpProgressPercent(user.xp)}%`,
                background: 'var(--dp-accent)',
              }}
            />
          </div>
          <div
            className="text-xs mt-0.5 text-right"
            style={{ color: 'var(--dp-text-muted)' }}
          >
            {user.xp % 100} / 100 XP
          </div>
        </div>
      </div>
    </div>
  )
}

/*
  StatusDot — цветной кружок статуса в углу аватара.
  Вынесли в отдельный компонент потому что логика цвета
  пригодится ещё в нескольких местах (список друзей и т.д.)
*/
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online:   'var(--dp-status-online)',
    coding:   'var(--dp-status-coding)',
    'in-game': 'var(--dp-status-ingame)',
    offline:  'var(--dp-status-offline)',
  }

  return (
    <div
      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
      style={{
        background: colors[status] ?? colors.offline,
        borderColor: 'var(--dp-bg-page)',
      }}
    />
  )
}