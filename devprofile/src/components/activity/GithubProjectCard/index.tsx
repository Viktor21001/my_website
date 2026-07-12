import { motion } from 'framer-motion'
import { LanguageBar } from '../../stats/LanguageBar'
import { useRepoLanguages } from '../../../hooks/useGithub'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import type { GithubRepo } from '../../../types/github'

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86400000)
  if (days === 0)  return 'сегодня'
  if (days === 1)  return 'вчера'
  if (days < 30)   return `${days}д. назад`
  if (days < 365)  return `${Math.floor(days / 30)}мес. назад`
  return `${Math.floor(days / 365)}г. назад`
}

export function GithubProjectCard({ repo }: { repo: GithubRepo }) {
  const { topLanguages, isLoading } = useRepoLanguages(repo.fullName)

  return (
    <motion.div
      className="flex flex-col gap-2.5 p-3.5 cursor-pointer"
      style={{
        background:   'var(--dp-bg-card)',
        borderBottom: '1px solid var(--dp-border)',
        transition:   'background var(--dp-transition)',
      }}
      variants={staggerItemVariants}
      whileHover={{ backgroundColor: 'var(--dp-bg-card-hover)' }}
      onClick={() => window.open(repo.url, '_blank')}
    >
      {/* Заголовок */}
      <div className="flex items-center gap-2 min-w-0">
        <span style={{ color: 'var(--dp-text-muted)', fontSize: 12 }}>⌥</span>
        <span
          className="text-sm font-mono font-medium truncate"
          style={{ color: 'var(--dp-accent-bright)' }}
        >
          {repo.name}
        </span>
        {repo.isPrivate && (
          <span
            className="shrink-0 px-1.5 py-0.5 text-xs rounded"
            style={{
              background: 'var(--dp-border)',
              color:      'var(--dp-text-muted)',
              fontSize:   10,
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

      {/* Языки */}
      {isLoading ? (
        <div className="dp-skeleton h-1.5 w-full rounded-full" />
      ) : (
        <LanguageBar languages={topLanguages} showLabels />
      )}

      {/* Мета */}
      <div
        className="flex items-center flex-wrap gap-2 text-xs"
        style={{ color: 'var(--dp-text-muted)' }}
      >
        {repo.stars > 0 && (
          <span className="flex items-center gap-1">
            <span>⭐</span> {repo.stars}
          </span>
        )}
        {repo.forks > 0 && (
          <span className="flex items-center gap-1">
            <span>⑂</span> {repo.forks}
          </span>
        )}
        {repo.topics.slice(0, 2).map((t) => (
          <span
            key={t}
            className="px-1.5 py-0.5 rounded font-mono"
            style={{
              background: 'rgba(79,163,212,0.08)',
              color:      'var(--dp-accent)',
              border:     '1px solid rgba(79,163,212,0.2)',
              fontSize:   10,
            }}
          >
            {t}
          </span>
        ))}
        <span className="ml-auto font-mono" style={{ fontSize: 11 }}>
          {timeAgo(repo.pushedAt)}
        </span>
      </div>
    </motion.div>
  )
}