import { useState } from 'react'
import { motion } from 'framer-motion'
import { GithubProjectCard } from '../GithubProjectCard'
import { ActivityFeed } from '../ActivityFeed'
import { GithubContributions } from '../../stats/GithubContributions'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useRecentRepos } from '../../../hooks/useGithub'

type Tab = 'projects' | 'activity'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'projects',  label: 'Проекты', icon: '⌥' },
  { id: 'activity',  label: 'GitHub',  icon: '↑' },
]

export function RecentActivity() {
  const [activeTab, setActiveTab] = useState<Tab>('projects')

  const { repos, isLoading: reposLoading, isError: reposError } = useRecentRepos()

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>

      {/* Шапка с вкладками */}
      <div
        className="flex items-center justify-between"
        style={{
          background:   'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--dp-border)',
        }}
      >
        <span className="dp-section-title" style={{ border: 'none', background: 'none' }}>
          Активность
        </span>

        {/* Вкладки */}
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-all duration-150"
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color: activeTab === tab.id
                  ? 'var(--dp-text-white)'
                  : 'var(--dp-text-secondary)',
              }}
            >
              <span style={{ fontSize: 10 }}>{tab.icon}</span>
              {tab.label}

              {/* Активная подчёркивающая линия */}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--dp-accent)' }}
                  layoutId="activeTab"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Контент вкладок */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {activeTab === 'projects' && (
          <>
            {reposLoading && <SkeletonCard />}
            {reposError   && <ErrorCard message="Не удалось загрузить репозитории" />}
            {!reposLoading && !reposError && repos.length === 0 && (
              <EmptyCard message="Нет публичных репозиториев" />
            )}
            {!reposLoading && !reposError && repos.map((repo) => (
              <GithubProjectCard key={repo.id} repo={repo} />
            ))}
          </>
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col gap-3">
            <GithubContributions />
            <ActivityFeed />
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}