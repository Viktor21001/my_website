import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { AGE_GROUPS, AGE_GROUP_LABELS } from '../../../config/fitnessConstants'
import { useLeaderboard } from '../../../hooks/useFitnessData'
import { EmptyCard } from '../../shared/Card'
import type { AgeGroup } from '../../../types/fitness'

export function AgeGroupLeaderboard() {
  const myAgeGroup = useAppSelector((state) => state.auth.user?.ageGroup)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(myAgeGroup ?? '25-30')

  // Сервер уже возвращает список отфильтрованным по группе и отсортированным по рангу
  const { leaderboard: rows } = useLeaderboard(ageGroup)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">Рейтинг по возрасту</div>

      {/* Переключатель возрастных групп */}
      <div className="flex flex-wrap gap-1.5 p-3" style={{ borderBottom: '1px solid var(--dp-border)' }}>
        {AGE_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setAgeGroup(g)}
            className="text-xs px-2.5 py-1 rounded-full transition-all duration-150"
            style={{
              background: ageGroup === g ? 'var(--dp-accent)' : 'transparent',
              color: ageGroup === g ? '#05141f' : 'var(--dp-text-secondary)',
              border: `1px solid ${ageGroup === g ? 'var(--dp-accent)' : 'var(--dp-border)'}`,
              cursor: 'pointer',
              fontWeight: ageGroup === g ? 600 : 400,
            }}
          >
            {AGE_GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyCard message="В этой возрастной группе пока нет участников" />
      ) : (
        <div className="flex flex-col">
          {rows.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 p-3"
              style={{
                borderBottom: '1px solid var(--dp-border)',
                background: entry.isCurrentUser ? 'var(--dp-bg-card-hover)' : 'transparent',
                borderLeft: entry.isCurrentUser ? '2px solid var(--dp-border-accent)' : '2px solid transparent',
              }}
            >
              <div
                className="shrink-0 w-6 text-center text-sm font-bold font-mono"
                style={{ color: entry.rank <= 3 ? 'var(--dp-accent-bright)' : 'var(--dp-text-muted)' }}
              >
                {entry.rank}
              </div>

              {entry.avatar ? (
                <img
                  src={entry.avatar}
                  alt={entry.name}
                  className="w-8 h-8 rounded-sm shrink-0"
                  style={{ border: '1px solid var(--dp-border)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', color: 'var(--dp-text-secondary)' }}
                >
                  {entry.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div
                  className="text-sm truncate"
                  style={{ color: entry.isCurrentUser ? 'var(--dp-text-white)' : 'var(--dp-text-primary)' }}
                >
                  {entry.name}
                  {entry.isCurrentUser && (
                    <span style={{ color: 'var(--dp-accent-bright)' }}> · вы</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                  Уровень {entry.level}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-mono font-semibold" style={{ color: 'var(--dp-text-code)' }}>
                  {entry.totalScore}
                </div>
                <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>очков</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
