/*
  GithubContributions — календарь контрибуций (зелёные квадраты) и
  «Activity overview» с ромбовидным графиком, как на реальном профиле
  github.com. REST API GitHub такого не отдаёт — данные приходят через
  GraphQL contributionsCollection (см. useGithub.ts/githubApi.ts).

  Цвет каждого квадрата — то, что прямо вернул GraphQL (day.color),
  без своей логики бакетов по уровням: тогда график 1-в-1 совпадает
  с тем, что человек видит на самом GitHub (тема аккаунта, праздничные
  цвета и т.п. подхватываются сами).
*/

import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useContributions } from '../../../hooks/useGithub'
import { SkeletonCard, EmptyCard } from '../../shared/Card'
import type { ContributionDay, ContributedRepo } from '../../../types/github'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const LEGEND_LEVELS = ['var(--dp-border)', '#0e4429', '#006d32', '#26a641', '#39d353']
const CELL_PX = 11
const GAP_PX = 3

export function GithubContributions() {
  const { contributions, isLoading, username } = useContributions()

  if (!username) return null
  if (isLoading) return <SkeletonCard />
  if (!contributions || contributions.weeks.length === 0) {
    return (
      <motion.div className="dp-panel" variants={staggerItemVariants}>
        <div className="dp-section-title">Активность на GitHub</div>
        <EmptyCard message="Нет данных об активности" />
      </motion.div>
    )
  }

  const { weeks, totals, contributedRepos, totalContributions } = contributions

  const monthLabels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, i) => {
    const firstDay = week[0]
    if (!firstDay) return
    const month = new Date(firstDay.date).getUTCMonth()
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: i, label: MONTH_LABELS[month] })
      lastMonth = month
    }
  })

  const gridWidth = weeks.length * (CELL_PX + GAP_PX)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">
        Активность на GitHub{' '}
        <span style={{ color: 'var(--dp-accent)' }}>{totalContributions}</span>
      </div>

      <div className="p-3 flex flex-col gap-4">
        {/* Календарь контрибуций */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ width: gridWidth + 28, minWidth: gridWidth + 28 }}>
            <div className="flex">
              <div style={{ width: 24 }} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, ${CELL_PX + GAP_PX}px)` }}>
                {weeks.map((_, i) => (
                  <span
                    key={i}
                    className="text-xs"
                    style={{ gridColumn: i + 1, color: 'var(--dp-text-muted)' }}
                  >
                    {monthLabels.find((m) => m.weekIndex === i)?.label ?? ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex">
              <div className="flex flex-col justify-between" style={{ width: 24, height: 7 * (CELL_PX + GAP_PX) - GAP_PX }}>
                {DOW_LABELS.map((label, i) => (
                  <span key={i} className="text-xs" style={{ color: 'var(--dp-text-muted)', lineHeight: `${CELL_PX}px` }}>
                    {label}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weeks.length}, ${CELL_PX}px)`,
                  gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                  gridAutoFlow: 'column',
                  gap: GAP_PX,
                }}
              >
                {weeks.map((week) => week.map((day) => <DaySquare key={day.date} day={day} />))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--dp-text-muted)' }}>
          <a
            href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-graphs-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"
            target="_blank" rel="noreferrer" className="dp-link"
          >
            Learn how we count contributions
          </a>
          <div className="flex items-center gap-1">
            <span>Less</span>
            {LEGEND_LEVELS.map((color, i) => (
              <span key={i} style={{ width: CELL_PX, height: CELL_PX, background: color, borderRadius: 2 }} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--dp-border)' }} />

        {/* Activity overview */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--dp-text-white)' }}>
              Activity overview
            </div>
            <ContributedToLine repos={contributedRepos} />
          </div>
          <OverviewDiamond totals={totals} />
        </div>
      </div>
    </motion.div>
  )
}

function DaySquare({ day }: { day: ContributionDay }) {
  return (
    <span
      style={{ width: CELL_PX, height: CELL_PX, background: day.color, borderRadius: 2 }}
      title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
    />
  )
}

function ContributedToLine({ repos }: { repos: ContributedRepo[] }) {
  if (repos.length === 0) {
    return <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Нет вкладов в другие репозитории</div>
  }

  const shown = repos.slice(0, 3)
  const restCount = repos.length - shown.length

  return (
    <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
      <span style={{ fontSize: 14 }}>🖥️</span>
      <div className="leading-relaxed">
        Contributed to{' '}
        {shown.map((r, i) => (
          <span key={r.nameWithOwner}>
            <a href={r.url} target="_blank" rel="noreferrer" className="dp-link">{r.nameWithOwner}</a>
            {i < shown.length - 1 ? ', ' : ''}
          </span>
        ))}
        {restCount > 0 && <> and {restCount} other repositor{restCount === 1 ? 'y' : 'ies'}</>}
      </div>
    </div>
  )
}

// Как на реальном GitHub: 4 статичных подписи по углам осей, но подпись
// той оси, что перевешивает — заменяется на «{процент}% Название» вместо
// обычной, а не рисуется отдельным (и постоянно перекрывающимся) текстом
// поверх точки — точка при этом двигается непрерывно вдоль вектора вклада
function OverviewDiamond({ totals }: { totals: { commits: number; issues: number; pullRequests: number; reviews: number } }) {
  const { commits, issues, pullRequests, reviews } = totals
  const total = commits + issues + pullRequests + reviews

  const AXIS_LEN = 65
  const vx = total > 0 ? (issues - commits) / total : 0
  const vy = total > 0 ? (pullRequests - reviews) / total : 0
  const dotX = 100 + vx * AXIS_LEN
  const dotY = 100 + vy * AXIS_LEN

  const axes = [
    { key: 'reviews', label: 'Code review', value: reviews, x: 100, y: 12, anchor: 'middle' as const },
    { key: 'issues', label: 'Issues', value: issues, x: 182, y: 104, anchor: 'start' as const },
    { key: 'pullRequests', label: 'Pull requests', value: pullRequests, x: 100, y: 196, anchor: 'middle' as const },
    { key: 'commits', label: 'Commits', value: commits, x: 18, y: 104, anchor: 'end' as const },
  ]
  const dominant = total > 0 ? axes.reduce((max, a) => (a.value > max.value ? a : max), axes[0]) : null
  const dominantPercent = dominant && total > 0 ? Math.round((dominant.value / total) * 100) : 0

  return (
    <svg viewBox="0 0 200 200" width={180} height={180} className="shrink-0 mx-auto" style={{ overflow: 'visible' }}>
      <line x1={100} y1={25} x2={100} y2={175} stroke="var(--dp-border)" strokeWidth={1} />
      <line x1={25} y1={100} x2={175} y2={100} stroke="var(--dp-border)" strokeWidth={1} />

      {axes.map((axis) => (
        <text
          key={axis.key} x={axis.x} y={axis.y} textAnchor={axis.anchor}
          fontSize={10} fill={axis.key === dominant?.key ? 'var(--dp-text-white)' : 'var(--dp-accent-bright)'}
        >
          {axis.key === dominant?.key ? `${dominantPercent}% ${axis.label}` : axis.label}
        </text>
      ))}

      <circle cx={dotX} cy={dotY} r={5} fill="var(--dp-green)" />
    </svg>
  )
}
