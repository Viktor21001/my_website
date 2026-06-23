/*
  RecentActivity — главная витрина активности.
  Объединяет GitHub проекты и Steam игры в один блок.
  
  Аналог "Недавняя активность" в Steam, но расширенный:
  - вкладка "Проекты" — репозитории с GitHub
  - вкладка "Игры"    — последние игры из Steam
  
  Сейчас данные моковые — в Фазе 3 и 4 подключим реальные API.
*/

import { useState } from 'react'
import { GithubProjectCard } from '../GithubProjectCard'
import { GameCard } from '../GameCard'
import type { GithubRepo } from '../../../types/github'
import type { SteamGame } from '../../../types/steam'

// Моковые репозитории — временно, пока не подключили GitHub API
const MOCK_REPOS: GithubRepo[] = [
  {
    id: 1,
    name: 'devprofile',
    fullName: 'yeliseyev/devprofile',
    description: 'Developer profile platform inspired by Steam. React + TypeScript.',
    url: 'https://github.com',
    stars: 3,
    forks: 0,
    language: 'TypeScript',
    languages: { TypeScript: 45820, CSS: 12300, HTML: 3200 },
    pushedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2025-01-01').toISOString(),
    topics: ['react', 'typescript', 'steam'],
    isPrivate: false,
  },
  {
    id: 2,
    name: 'moi-sklad-internship',
    fullName: 'yeliseyev/moi-sklad-internship',
    description: 'Tasks completed during МойСклад internship.',
    url: 'https://github.com',
    stars: 0,
    forks: 0,
    language: 'TypeScript',
    languages: { TypeScript: 28000, JavaScript: 5000 },
    pushedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-06-01').toISOString(),
    topics: ['react', 'internship'],
    isPrivate: false,
  },
  {
    id: 3,
    name: 'hse-thesis',
    fullName: 'yeliseyev/hse-thesis',
    description: 'HSE master thesis — RPA tools adaptation for HR processes.',
    url: 'https://github.com',
    stars: 1,
    forks: 0,
    language: 'Python',
    languages: { Python: 12000, Markdown: 8000 },
    pushedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-09-01').toISOString(),
    topics: ['rpa', 'hse'],
    isPrivate: false,
  },
]

// Моковые игры — временно, пока не подключили Steam API
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

type Tab = 'projects' | 'games'

export function RecentActivity() {
  // Локальный стейт для активной вкладки
  // Почему useState а не Redux? Это локальное UI состояние компонента
  const [activeTab, setActiveTab] = useState<Tab>('projects')

  return (
    <div className="dp-panel overflow-hidden">

      {/* Заголовок + вкладки */}
      <div
        className="flex items-center justify-between"
        style={{
          background: 'var(--dp-bg-panel)',
          borderBottom: '1px solid var(--dp-border)',
        }}
      >
        <span className="dp-section-title border-0">
          Недавняя активность
        </span>

        {/* Вкладки как в Steam */}
        <div className="flex">
          <TabButton
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
          >
            Проекты
          </TabButton>
          <TabButton
            active={activeTab === 'games'}
            onClick={() => setActiveTab('games')}
          >
            Игры
          </TabButton>
        </div>
      </div>

      {/* Содержимое вкладки */}
      {activeTab === 'projects' && (
        <div>
          {MOCK_REPOS.map((repo) => (
            <GithubProjectCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}

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

// Кнопка вкладки — вынесена чтобы не дублировать стили
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
        borderBottom: active ? '2px solid var(--dp-accent)' : '2px solid transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}