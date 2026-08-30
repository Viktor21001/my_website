import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { BADGE_CONFIG } from '../../../config/badges'
import { staggerItemVariants, tooltipVariants } from '../../../hooks/useAnimatedMount'
import { useTooltipPosition } from '../../../hooks/useTooltipPosition'
import type { Badge, BadgeId } from '../../../types/profile'

const TOOLTIP_WIDTH = 192

export function BadgesRow({ ids }: { ids?: BadgeId[] } = {}) {
  const badges      = useAppSelector((state) => state.profile.badges)
  const unlockedIds = new Set(badges.map((b) => b.id))
  const allIds      = ids ?? (Object.keys(BADGE_CONFIG) as BadgeId[])

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">
        Значки{' '}
        <span style={{ color: 'var(--dp-accent)' }}>{badges.length}</span>
        <span style={{ color: 'var(--dp-text-muted)' }}> / {allIds.length}</span>
      </div>
      <div className="p-3 flex flex-wrap gap-2">
        {allIds.map((id) => (
          <BadgeItem
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

function BadgeItem({
  id,
  badge,
  isUnlocked,
}: {
  id: BadgeId
  badge?: Badge
  isUnlocked: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const config = BADGE_CONFIG[id]
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
          background:  isUnlocked ? 'var(--dp-bg-card)' : 'rgba(0,0,0,0.2)',
          border:      `1px solid ${isUnlocked ? 'var(--dp-border-light)' : 'var(--dp-border)'}`,
          opacity:     isUnlocked ? 1 : 0.3,
          filter:      isUnlocked ? 'none' : 'grayscale(1)',
          borderRadius: 'var(--dp-radius-md)',
          boxShadow:   isUnlocked && hovered ? 'var(--dp-shadow-glow)' : 'none',
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
            background:  'var(--dp-bg-panel)',
            border:      '1px solid var(--dp-border-accent)',
            boxShadow:   'var(--dp-shadow-lg)',
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
                style={{
                  color:       'var(--dp-green)',
                  borderTop:   '1px solid var(--dp-border)',
                }}
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
        'dev-badge-tooltip'
      )}
    </div>
  )
}