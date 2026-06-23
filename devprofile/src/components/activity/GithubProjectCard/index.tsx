/*
  GithubProjectCard — карточка репозитория в витрине активности.
  
  ┌─────────────────────────────────────────┐
  │ 📁 devprofile                           │
  │ Developer profile platform like Steam  │
  │                                         │
  │ TS ████████ 72%  CSS ███ 20%           │
  │                                         │
  │ ⭐ 12   🍴 3   Последний коммит: 2д    │
  └─────────────────────────────────────────┘
  
  Принимает данные через props — не знает откуда они пришли.
  Сейчас это моковые данные, потом — из GitHub API.
*/

import { LanguageBar } from '../../stats/LanguageBar'
import type { GithubRepo } from '../../../types/github'
import type { TopLanguage } from '../../../types/github'
import { LANGUAGE_COLORS } from '../../../config/constants'

interface GithubProjectCardProps {
  repo: GithubRepo
}

// Форматируем дату в человекочитаемый вид: "2 дня назад"
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'сегодня'
  if (days === 1) return 'вчера'
  if (days < 30) return `${days} дн. назад`
  const months = Math.floor(days / 30)
  return `${months} мес. назад`
}

// Форматируем минуты в "Xч Yмин" или "Xч"
export function formatPlaytime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

// Конвертируем languages { "TypeScript": 45820 } → TopLanguage[]
function repoLanguagesToTop(languages: Record<string, number>): TopLanguage[] {
  const total = Object.values(languages).reduce((a, b) => a + b, 0)
  if (total === 0) return []
  return Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([name, bytes]) => ({
      name,
      percent: Math.round((bytes / total) * 100),
      color: LANGUAGE_COLORS[name] ?? '#8b8b8b',
    }))
}

export function GithubProjectCard({ repo }: GithubProjectCardProps) {
  const topLanguages = repoLanguagesToTop(repo.languages)

  return (
    <div
      className="p-3 flex flex-col gap-2 transition-colors duration-150 cursor-pointer"
      style={{
        background: 'var(--dp-bg-card)',
        borderBottom: '1px solid var(--dp-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--dp-bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--dp-bg-card)'
      }}
      onClick={() => window.open(repo.url, '_blank')}
    >
      {/* Название репо */}
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--dp-text-muted)', fontSize: 13 }}>📁</span>
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--dp-accent)' }}
        >
          {repo.name}
        </span>
        {/* Приватный репо */}
        {repo.isPrivate && (
          <span
            className="text-xs px-1 rounded shrink-0"
            style={{
              background: 'var(--dp-border)',
              color: 'var(--dp-text-muted)',
            }}
          >
            приватный
          </span>
        )}
      </div>

      {/* Описание */}
      {repo.description && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: 'var(--dp-text-secondary)' }}
        >
          {repo.description}
        </p>
      )}

      {/* Полоска языков */}
      {topLanguages.length > 0 && (
        <LanguageBar languages={topLanguages} showLabels={true} />
      )}

      {/* Статистика: звёзды, форки, дата */}
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: 'var(--dp-text-muted)' }}
      >
        {repo.stars > 0 && <span>⭐ {repo.stars}</span>}
        {repo.forks > 0 && <span>🍴 {repo.forks}</span>}
        <span className="ml-auto">
          последний коммит: {timeAgo(repo.pushedAt)}
        </span>
      </div>
    </div>
  )
}