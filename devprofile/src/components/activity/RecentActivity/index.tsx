/*
  RecentActivity — финальная версия для Фазы 4.
  Теперь все три вкладки с реальными данными:
  - Проекты → GitHub API
  - GitHub   → GitHub Events API
  - Игры     → Steam API (убрали мок)
*/

import { useState } from 'react'
import { GithubProjectCard } from '../GithubProjectCard'
import { GameCard } from '../GameCard'
import { ActivityFeed } from '../ActivityFeed'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { useRecentRepos } from '../../../hooks/useGithub'
import { useRecentGames } from '../../../hooks/useSteam'

type Tab = 'projects' | 'activity' | 'games'

export function RecentActivity() {
  const [activeTab, setActiveTab] = useState<Tab>('projects')

  const { repos, isLoading: reposLoading, isError: reposError } =
    useRecentRepos()

  /*
    Вызываем оба хука сразу — не внутри условия.
    React требует чтобы хуки вызывались всегда в одном порядке.
    RTK Query сам не делает лишних запросов если вкладка не активна —
    данные просто лежат в кеше и ждут.
  */
  const { games, isLoading: gamesLoading, isError: gamesError } =
    useRecentGames()

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
          {reposLoading && <SkeletonCard />}
          {reposError && (
            <ErrorCard message="Не удалось загрузить репозитории" />
          )}
          {!reposLoading && !reposError && repos.length === 0 && (
            <EmptyCard message="Нет публичных репозиториев" />
          )}
          {!reposLoading && !reposError && repos.map((repo) => (
            <GithubProjectCard key={repo.id} repo={repo} />
          ))}
        </>
      )}

      {/* Вкладка: GitHub активность */}
      {activeTab === 'activity' && <ActivityFeed />}

      {/* Вкладка: Игры — теперь реальные данные */}
      {activeTab === 'games' && (
        <>
          {gamesLoading && <SkeletonCard />}
          {gamesError && (
            <ErrorCard message="Проверь Steam ID и настройки приватности" />
          )}
          {!gamesLoading && !gamesError && games.length === 0 && (
            <EmptyCard message="Нет недавних игр за последние 2 недели" />
          )}
          {!gamesLoading && !gamesError && games.map((game) => (
            <GameCard key={game.appId} game={game} />
          ))}
        </>
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