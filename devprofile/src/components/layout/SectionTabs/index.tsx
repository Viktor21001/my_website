/*
  SectionTabs — верхний переключатель General / Dev / Fitness / Games.
  Тот же паттерн таб-кнопок + layoutId-подчёркивание, что и в
  RecentActivity/WorkoutLog, но привязан к глобальному uiSlice.activeSection,
  а не к локальному состоянию — переключает контент всей страницы.

  Каждая кнопка — ещё и dnd-kit droppable-цель (id: 'tab-<section>'):
  во время перетаскивания панели (см. AppBoard) наведение на кнопку другой
  вкладки переключает activeSection, не отпуская курсор — та вкладка
  «перелистывается», и панель можно довести до места уже на ней.
*/

import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setActiveSection } from '../../../store/slices/uiSlice'
import type { ActiveSection } from '../../../store/slices/uiSlice'

const SECTIONS: { id: ActiveSection; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '🏠' },
  { id: 'profile', label: 'Dev',     icon: '💻' },
  { id: 'fitness', label: 'Fitness', icon: '🏋️' },
  { id: 'games',   label: 'Games',   icon: '🎮' },
]

export function SectionTabs() {
  const activeSection = useAppSelector((state) => state.ui.activeSection)

  return (
    <div
      className="flex items-center gap-1 px-2"
      style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dp-border)' }}
    >
      {SECTIONS.map((section) => (
        <SectionTabButton key={section.id} section={section} isActive={activeSection === section.id} />
      ))}
    </div>
  )
}

function SectionTabButton({
  section, isActive,
}: {
  section: { id: ActiveSection; label: string; icon: string }
  isActive: boolean
}) {
  const dispatch = useAppDispatch()
  const { setNodeRef } = useDroppable({ id: `tab-${section.id}` })

  return (
    <button
      ref={setNodeRef}
      onClick={() => dispatch(setActiveSection(section.id))}
      className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all duration-150"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
      }}
    >
      <span>{section.icon}</span>
      {section.label}

      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'var(--dp-accent)' }}
          layoutId="activeSectionTab"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
    </button>
  )
}
