/*
  SectionTabs — верхний переключатель Dev / Fitness / Games.
  Тот же паттерн таб-кнопок + layoutId-подчёркивание, что и в
  RecentActivity/WorkoutLog, но привязан к глобальному uiSlice.activeSection,
  а не к локальному состоянию — переключает контент всей страницы.
*/

import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setActiveSection } from '../../../store/slices/uiSlice'
import type { ActiveSection } from '../../../store/slices/uiSlice'

const SECTIONS: { id: ActiveSection; label: string; icon: string }[] = [
  { id: 'profile', label: 'Dev',     icon: '💻' },
  { id: 'fitness', label: 'Fitness', icon: '🏋️' },
  { id: 'games',   label: 'Games',   icon: '🎮' },
]

export function SectionTabs() {
  const dispatch = useAppDispatch()
  const activeSection = useAppSelector((state) => state.ui.activeSection)

  return (
    <div
      className="flex items-center gap-1 px-2"
      style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dp-border)' }}
    >
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => dispatch(setActiveSection(section.id))}
          className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all duration-150"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSection === section.id ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
          }}
        >
          <span>{section.icon}</span>
          {section.label}

          {activeSection === section.id && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--dp-accent)' }}
              layoutId="activeSectionTab"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
