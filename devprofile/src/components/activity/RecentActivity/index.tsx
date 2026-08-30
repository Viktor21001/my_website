import { useState } from 'react'
import { motion } from 'framer-motion'
import { GithubProjectCard } from '../GithubProjectCard'
import { ActivityFeed } from '../ActivityFeed'
import { GithubContributions } from '../../stats/GithubContributions'
import { SkeletonCard, ErrorCard, EmptyCard } from '../../shared/Card'
import { staggerItemVariants, fadeVariants } from '../../../hooks/useAnimatedMount'
import { useRecentRepos } from '../../../hooks/useGithub'
import { PanelHeader } from '../../shared/PanelHeader'

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

      <PanelHeader
        title="Активность"
        right={
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
        }
      />

      {/*
        Контент вкладок — вместо своих initial/animate объектов используем
        variants (та же схема, что и у остальных motion.div в этом дереве):
        собственный initial/animate тван на key={activeTab}-ремаунте иногда
        застревал в initial (opacity:0) до наведения мышью — StrictMode
        в деве дважды монтирует эффекты, и это ломало именно самостоятельно
        управляемые анимации. Через variants состояние "visible" читается
        из контекста родителя (PageWrapper), а не из своего же эффекта —
        так надёжнее.
      */}
      <motion.div key={activeTab} variants={fadeVariants}>
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