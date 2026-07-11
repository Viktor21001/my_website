/*
  GithubProjectCard — карточка репозитория.
  
  Что изменилось по сравнению с Фазой 1:
  - Языки больше не берутся из repo.languages (там пусто при первом запросе)
  - Вызываем useRepoLanguages(repo.fullName) — отдельный запрос на каждый репо
  - RTK Query кеширует результат — повторный рендер не вызывает новый fetch
  
  Почему отдельный запрос на языки а не в одном с репо?
  GitHub API не отдаёт языки в списке репозиториев — только основной язык.
  Детальный breakdown языков — отдельный эндпоинт /repos/{owner}/{repo}/languages
*/

import { LanguageBar } from '../../stats/LanguageBar'
import { useRepoLanguages } from '../../../hooks/useGithub'
import type { GithubRepo } from '../../../types/github'

interface GithubProjectCardProps {
  repo: GithubRepo
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'сегодня'
  if (days === 1) return 'вчера'
  if (days < 30) return `${days} дн. назад`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} мес. назад`
  return `${Math.floor(months / 12)} г. назад`
}

export function GithubProjectCard({ repo }: GithubProjectCardProps) {
  /*
    Запрашиваем языки для этого конкретного репо.
    RTK Query автоматически дедуплицирует запросы —
    если два компонента запрашивают одно и то же, уйдёт один запрос.
  */
  const { topLanguages, isLoading: langLoading } = useRepoLanguages(repo.fullName)

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
      {/* Название */}
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--dp-text-muted)', fontSize: 13 }}>📁</span>
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--dp-accent)' }}
        >
          {repo.name}
        </span>
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

      {/* Языки — скелетон пока грузятся */}
      {langLoading ? (
        <div
          className="h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--dp-border)' }}
        />
      ) : (
        <LanguageBar languages={topLanguages} showLabels={true} />
      )}

      {/* Статистика */}
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: 'var(--dp-text-muted)' }}
      >
        {repo.stars > 0 && <span>⭐ {repo.stars}</span>}
        {repo.forks > 0 && <span>🍴 {repo.forks}</span>}
        {repo.topics.slice(0, 2).map((topic) => (
          <span
            key={topic}
            className="px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--dp-bg-panel)',
              color: 'var(--dp-accent)',
              border: '1px solid var(--dp-border)',
            }}
          >
            {topic}
          </span>
        ))}
        <span className="ml-auto">
          {timeAgo(repo.pushedAt)}
        </span>
      </div>
    </div>
  )
}