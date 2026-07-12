import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { BADGE_CONFIG } from '../../../config/badges'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import type { Badge, BadgeId } from '../../../types/profile'

export function BadgesRow() {
  const badges       = useAppSelector((state) => state.profile.user.badges)
  const unlockedIds  = new Set(badges.map((b) => b.id))
  const allBadgeIds  = Object.keys(BADGE_CONFIG) as BadgeId[]

  return (
    /*
      motion.div с staggerItemVariants — этот блок является
      дочерним элементом staggerContainer в PageWrapper.
      Он появится в своё время в каскаде.
    */
    <motion.div
      className="dp-panel overflow-hidden"
      variants={staggerItemVariants}
    >
      <div className="dp-section-title">
        Значки — {badges.length} из {allBadgeIds.length}
      </div>

      <div className="p-3 flex flex-wrap gap-2">
        {allBadgeIds.map((id) => {
          const isUnlocked = unlockedIds.has(id)
          const badgeData  = badges.find((b) => b.id === id)
          return (
            <BadgeItem
              key={id}
              id={id}
              badge={badgeData}
              isUnlocked={isUnlocked}
            />
          )
        })}
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
  const [isHovered, setIsHovered] = useState(false)
  const config = BADGE_CONFIG[id]

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="w-12 h-12 flex items-center justify-center text-2xl rounded cursor-pointer"
        style={{
          background: isUnlocked
            ? 'var(--dp-bg-card)'
            : 'var(--dp-bg-panel)',
          border: `1px solid ${isUnlocked ? 'var(--dp-border)' : 'var(--dp-border)'}`,
          opacity: isUnlocked ? 1 : 0.35,
          filter:  isUnlocked ? 'none' : 'grayscale(100%)',
        }}
        /*
          whileHover — анимация при наведении.
          scale: 1.15 — лёгкое увеличение как в Steam.
          Только для разблокированных бейджей.
        */
        whileHover={isUnlocked ? { scale: 1.15 } : {}}
        whileTap={isUnlocked ? { scale: 0.95 } : {}}
        transition={{ duration: 0.15 }}
      >
        {config.icon}
      </motion.div>

      {/* Тултип */}
      {isHovered && (
        <motion.div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-44 p-2.5 rounded text-xs text-center pointer-events-none"
          style={{
            background: 'var(--dp-bg-panel)',
            border:     '1px solid var(--dp-border-light)',
            boxShadow:  'var(--dp-shadow-panel)',
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="font-semibold mb-0.5"
            style={{ color: isUnlocked ? 'var(--dp-accent)' : 'var(--dp-text-muted)' }}
          >
            {config.label}
          </div>
          <div style={{ color: 'var(--dp-text-secondary)' }}>
            {config.description}
          </div>
          {isUnlocked ? (
            badge?.unlockedAt && (
              <div className="mt-1" style={{ color: 'var(--dp-accent-green)' }}>
                ✓ Получен{' '}
                {new Date(badge.unlockedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>
            )
          ) : (
            <div className="mt-1" style={{ color: 'var(--dp-text-muted)' }}>
              🔒 Не получен
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}