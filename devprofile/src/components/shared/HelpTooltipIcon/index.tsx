/*
  HelpTooltipIcon — маленький кружок с «?», при наведении показывает
  портал-тултип (document.body, position: fixed) с одной или несколькими
  секциями текста. Вынесено из SettingsPanel/SteamIdHelpIcon — второй
  такой же тултип понадобился для Steam API ключа, а третий — на блоке
  достижений (см. AchievementsLibrary), так что общий код того стоит.

  Портал, а не absolute внутри родителя — иначе тултип обрезался бы
  overflow:hidden предком (bottom-sheet настроек, узкая панель и т.п.).
*/

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTooltipPosition } from '../../../hooks/useTooltipPosition'
import { tooltipVariants } from '../../../hooks/useAnimatedMount'

export interface HelpTooltipSection {
  title: string
  body: string
}

interface HelpTooltipIconProps {
  sections: HelpTooltipSection[]
  portalKey: string
  width?: number
  // Позиционирование самого «?» — по умолчанию как было у SteamIdHelpIcon
  // (внутри relative-поля справа по центру), но нужен и вариант "inline"
  // без absolute-позиционирования (блок достижений, текст посреди панели)
  placement?: 'absolute-right' | 'inline'
}

export function HelpTooltipIcon({ sections, portalKey, width = 260, placement = 'absolute-right' }: HelpTooltipIconProps) {
  const [hovered, setHovered] = useState(false)
  const { triggerRef, position, show } = useTooltipPosition<HTMLSpanElement>(width)

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => { setHovered(true); show() }}
      onMouseLeave={() => setHovered(false)}
      className={placement === 'absolute-right' ? 'absolute flex items-center justify-center rounded-full select-none' : 'inline-flex items-center justify-center rounded-full select-none align-middle'}
      style={{
        ...(placement === 'absolute-right' ? { top: '50%', right: 10, transform: 'translateY(-50%)' } : {}),
        width: 18, height: 18, fontSize: 11, cursor: 'help',
        background: 'var(--dp-bg-card)',
        border: '1px solid var(--dp-border)',
        color: 'var(--dp-text-secondary)',
      }}
    >
      ?

      {hovered && position && createPortal(
        <motion.div
          className="fixed z-50 p-3 rounded pointer-events-none"
          style={{
            bottom: position.bottom,
            left:   position.left,
            width,
            background:  'var(--dp-bg-panel)',
            border:      '1px solid var(--dp-border-accent)',
            boxShadow:   'var(--dp-shadow-lg)',
            borderRadius: 'var(--dp-radius-md)',
          }}
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
        >
          {sections.map((section, i) => (
            <div key={section.title} style={i > 0 ? { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--dp-border)' } : undefined}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--dp-accent-bright)' }}>
                {section.title}
              </div>
              <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
                {section.body}
              </div>
            </div>
          ))}
        </motion.div>,
        document.body,
        portalKey
      )}
    </span>
  )
}
