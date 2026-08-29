/*
  ActivityFeed — лента последних действий на GitHub.
  Аналог раздела "Последние коммиты" на странице GitHub пользователя.
  
  Показывает: коммиты, открытые PR, созданные репозитории.
  Данные берём из useActivityFeed() хука.
*/

import { useActivityFeed } from '../../../hooks/useGithub'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'

// Иконки и подписи для разных типов событий
const EVENT_CONFIG = {
  commit: {
    icon: '⬆',
    color: 'var(--dp-accent-green)',
    label: 'коммит',
  },
  pr: {
    icon: '⤵',
    color: 'var(--dp-accent)',
    label: 'pull request',
  },
  repo_created: {
    icon: '✦',
    color: 'var(--dp-accent-orange)',
    label: 'новый репо',
  },
} as const

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes} мин. назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} дн. назад`
  return `${Math.floor(days / 30)} мес. назад`
}

export function ActivityFeed() {
  const { feedItems, isLoading, isError } = useActivityFeed()

  if (isLoading) return <SkeletonCard />
  if (isError)   return <ErrorCard message="Не удалось загрузить активность GitHub" />

  return (
    <div className="dp-panel overflow-hidden">
      <div className="dp-section-title">Последние события</div>

      {feedItems.length === 0 ? (
        <EmptyCard message="Нет публичной активности" />
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--dp-border)' }}>
          {feedItems.slice(0, 10).map((item) => {
            const config = EVENT_CONFIG[item.type]

            return (
              <div
                key={item.id}
                className="px-3 py-2 flex items-start gap-2.5 transition-colors duration-150"
                style={{ background: 'var(--dp-bg-card)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--dp-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--dp-bg-card)'
                }}
              >
                {/* Иконка типа события */}
                <span
                  className="text-xs mt-0.5 shrink-0 font-bold"
                  style={{ color: config.color }}
                >
                  {config.icon}
                </span>

                {/* Содержимое */}
                <div className="flex-1 min-w-0">
                  {/* Название репо */}
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--dp-accent)' }}
                  >
                    {item.repoName.split('/')[1]}
                  </span>

                  {/* Сообщение коммита или описание события */}
                  {item.message && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--dp-text-secondary)' }}
                    >
                      {item.message}
                    </p>
                  )}
                </div>

                {/* Время */}
                <span
                  className="text-xs shrink-0"
                  style={{ color: 'var(--dp-text-muted)' }}
                >
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}