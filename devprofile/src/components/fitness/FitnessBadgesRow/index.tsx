/*
  FitnessBadgesRow — структурный клон components/profile/BadgesRow
  под фитнес-бейджи (state.fitness.badges + FITNESS_BADGE_CONFIG).
*/

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { FITNESS_BADGE_CONFIG } from '../../../config/fitnessBadges'
import { staggerItemVariants, tooltipVariants } from '../../../hooks/useAnimatedMount'
import { useTooltipPosition } from '../../../hooks/useTooltipPosition'
import { PanelHeader } from '../../shared/PanelHeader'
import type { FitnessBadge, FitnessBadgeId } from '../../../types/fitness'

const TOOLTIP_WIDTH = 192

export function FitnessBadgesRow() {
  const badges = useAppSelector((state) => state.fitness.badges)
  const unlockedIds = new Set(badges.map((b) => b.id))
  const allIds = Object.keys(FITNESS_BADGE_CONFIG) as FitnessBadgeId[]

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <PanelHeader title={<>
        Достижения{' '}
        <span style={{ color: 'var(--dp-green)' }}>{badges.length}</span>
        <span style={{ color: 'var(--dp-text-muted)' }}> / {allIds.length}</span>
      </>} />
      <div className="p-3 flex flex-wrap gap-2">
        {allIds.map((id) => (
          <FitnessBadgeItem
            key={id}
            id={id}
            badge={badges.find((b) => b.id === id)}
            isUnlocked={unlockedIds.has(id)}
          />
        ))}
      </div>
    </motion.div>
  )
}

function FitnessBadgeItem({
  id,
  badge,
  isUnlocked,
}: {
  id: FitnessBadgeId
  badge?: FitnessBadge
  isUnlocked: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const config = FITNESS_BADGE_CONFIG[id]
  const { triggerRef, position, show } = useTooltipPosition<HTMLDivElement>(TOOLTIP_WIDTH)

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => { setHovered(true); show() }}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="w-12 h-12 flex items-center justify-center text-2xl rounded cursor-pointer select-none"
        style={{
          background: isUnlocked ? 'var(--dp-bg-card)' : 'rgba(0,0,0,0.2)',
          border: `1px solid ${isUnlocked ? 'var(--dp-border-light)' : 'var(--dp-border)'}`,
          opacity: isUnlocked ? 1 : 0.3,
          filter: isUnlocked ? 'none' : 'grayscale(1)',
          borderRadius: 'var(--dp-radius-md)',
          boxShadow: isUnlocked && hovered ? '0 0 24px rgba(139,195,74,0.3)' : 'none',
        }}
        whileHover={isUnlocked ? { scale: 1.18, y: -2 } : {}}
        whileTap={isUnlocked ? { scale: 0.92 } : {}}
        transition={{ duration: 0.15 }}
      >
        {config.icon}
      </motion.div>

      {hovered && position && createPortal(
        <motion.div
          className="fixed z-50 p-3 rounded pointer-events-none"
          style={{
            bottom: position.bottom,
            left:   position.left,
            width:  TOOLTIP_WIDTH,
            background: 'var(--dp-bg-panel)',
            border: '1px solid var(--dp-border-accent)',
            boxShadow: 'var(--dp-shadow-lg)',
            borderRadius: 'var(--dp-radius-md)',
          }}
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: isUnlocked ? 'var(--dp-accent-bright)' : 'var(--dp-text-muted)' }}
          >
            {config.label}
          </div>
          <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
            {config.description}
          </div>

          {isUnlocked ? (
            badge?.unlockedAt && (
              <div
                className="text-xs mt-2 pt-2 font-mono"
                style={{ color: 'var(--dp-green)', borderTop: '1px solid var(--dp-border)' }}
              >
                ✓ {new Date(badge.unlockedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>
            )
          ) : (
            <div
              className="text-xs mt-2 pt-2"
              style={{ color: 'var(--dp-text-muted)', borderTop: '1px solid var(--dp-border)' }}
            >
              🔒 Не получен
            </div>
          )}
        </motion.div>,
        document.body,
        'fitness-badge-tooltip'
      )}
    </div>
  )
}
