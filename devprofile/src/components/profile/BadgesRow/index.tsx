/*
  BadgesRow — строка значков достижений.
  Аналог блока "Значки" в правой колонке Steam.
  
  Каждый значок — иконка с тултипом при наведении.
  Данные берём из Redux store (user.badges).
*/

import { useState } from 'react'
import { useAppSelector } from '../../../hooks/redux'
import type { Badge } from '../../../types/profile'

export function BadgesRow() {
  const badges = useAppSelector((state) => state.profile.user.badges)

  return (
    <div className="dp-panel">
      {/* Заголовок секции */}
      <div className="dp-section-title">
        Значки {badges.length}
      </div>

      {/* Список значков */}
      <div className="p-3 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  )
}

/*
  BadgeItem — отдельный значок с тултипом.
  Тултип показывается при наведении через локальный useState.
  Почему useState а не Redux?
  Потому что "наведена ли мышь на этот значок" — это
  локальное UI состояние конкретного элемента, не глобальное.
*/
function BadgeItem({ badge }: { badge: Badge }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Сам значок */}
      <div
        className="w-12 h-12 flex items-center justify-center text-2xl rounded cursor-pointer transition-all duration-150"
        style={{
          background: isHovered ? 'var(--dp-bg-hover)' : 'var(--dp-bg-card)',
          border: `1px solid ${isHovered ? 'var(--dp-border-light)' : 'var(--dp-border)'}`,
        }}
      >
        {badge.icon}
      </div>

      {/* Тултип — появляется при наведении */}
      {isHovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-40 p-2 rounded text-xs text-center pointer-events-none"
          style={{
            background: 'var(--dp-bg-panel)',
            border: '1px solid var(--dp-border-light)',
            color: 'var(--dp-text-primary)',
            boxShadow: 'var(--dp-shadow-panel)',
          }}
        >
          <div className="font-semibold mb-0.5" style={{ color: 'var(--dp-accent)' }}>
            {badge.label}
          </div>
          <div style={{ color: 'var(--dp-text-secondary)' }}>
            {badge.description}
          </div>
        </div>
      )}
    </div>
  )
}