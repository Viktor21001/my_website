/*
  RecentActivity — теперь использует реальные данные.
  
  Что изменилось:
  - Вкладка "Проекты" — реальные репо из GitHub API
  - Вкладка "Игры" — пока моковые (подключим в Фазе 4)
  - Вкладка "Активность" — лента коммитов и PR (новое)
  - Добавили состояния loading и error
  
  Моковые данные игр оставляем до Фазы 4.
*/

import { useState } from 'react'
import { GithubProjectCard } from '../GithubProjectCard'
import { GameCard } from '../GameCard'
import { ActivityFeed } from '../ActivityFeed'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { useRecentRepos } from '../../../hooks/useGithub'
import type { SteamGame } from '../../../types/steam'

// Моковые игры — уберём в Фазе 4
const MOCK_GAMES: SteamGame[] = [
  {
    appId: 2054450,
    name: 'Subnautica 2',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2054450/header.jpg',
    playtimeForever: 1800,
    playtime2Weeks: 180,
    lastPlayed: Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60,
  },
  {
    appId: 418370,
    name: 'Resident Evil 7',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/418370/header.jpg',
    playtimeForever: 120,
    playtime2Weeks: 120,
    lastPlayed: Math.floor(Date.now() / 1000) - 22 * 24 * 60 * 60,
  },
  {
    appId: 220200,
    name: 'Kerbal Space Program',
    imgIconUrl: '',
    imgLogoUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/220200/header.jpg',
    playtimeForever: 3420,
    lastPlayed: Math.floor(Date.now() / 1000) - 33 * 24 * 60 * 60,
  },
]

type Tab = 'projects' | 'games' | 'activity'

export function RecentActivity() {
  const [activeTab, setActiveTab] = useState<Tab>('projects')

  /*
    Вызываем хук всегда — нельзя вызывать хуки внутри условий.
    RTK Query сам не делает запрос если skip: true
    (логика в useRecentRepos через skip: !username)
  */
  const { repos, isLoading, isError } = useRecentRepos()

  return (
    <div className="dp-panel overflow-hidden">

      {/* Шапка с вкладками */}
      <div
        className="flex items-center justify-between"
        style={{
          background: 'var(--dp-bg-panel)',
          borderBottom: '1px solid var(--dp-border)',
        }}
      >
        <span
          className="px-3 py-2 text-xs uppercase tracking-wider"
          style={{ color: 'var(--dp-text-secondary)' }}
        >
          Активность
        </span>

        <div className="flex">
          {(['projects', 'activity', 'games'] as Tab[]).map((tab) => (
            <TabButton
              key={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'projects' && 'Проекты'}
              {tab === 'activity' && 'GitHub'}
              {tab === 'games'    && 'Игры'}
            </TabButton>
          ))}
        </div>
      </div>

      {/* Вкладка: Проекты */}
      {activeTab === 'projects' && (
        <>
          {isLoading && <SkeletonCard />}
          {isError   && <ErrorCard message="Не удалось загрузить репозитории" />}
          {!isLoading && !isError && repos.length === 0 && (
            <EmptyCard message="Нет публичных репозиториев" />
          )}
          {!isLoading && !isError && repos.map((repo) => (
            <GithubProjectCard key={repo.id} repo={repo} />
          ))}
        </>
      )}

      {/* Вкладка: GitHub активность */}
      {activeTab === 'activity' && <ActivityFeed />}

      {/* Вкладка: Игры (пока мок) */}
      {activeTab === 'games' && (
        <div>
          {MOCK_GAMES.map((game) => (
            <GameCard key={game.appId} game={game} />
          ))}
        </div>
      )}

    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs transition-colors duration-150"
      style={{
        background: active ? 'var(--dp-bg-card)' : 'transparent',
        color: active ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
        borderBottom: active
          ? '2px solid var(--dp-accent)'
          : '2px solid transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}