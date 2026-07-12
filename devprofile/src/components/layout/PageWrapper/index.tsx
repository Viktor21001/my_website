/*
  PageWrapper — добавляем анимации появления блоков.

  motion.div из Framer Motion — это обычный div но с анимацией.
  variants описывают состояния: hidden → visible.
  initial="hidden" animate="visible" — запускает анимацию при монтировании.
*/

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch } from '../../../hooks/redux'
import { toggleBackgroundEditor } from '../../../store/slices/uiSlice'
import { fadeUpVariants, staggerContainerVariants } from '../../../hooks/useAnimatedMount'

interface PageWrapperProps {
  header:      ReactNode
  leftColumn:  ReactNode
  rightColumn: ReactNode
}

export function PageWrapper({ header, leftColumn, rightColumn }: PageWrapperProps) {
  const dispatch = useAppDispatch()

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-[990px] mx-auto px-4 pb-8">

        {/* Шапка — появляется первой */}
        <motion.div
          className="mb-4"
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          {header}
        </motion.div>

        {/* Кнопка настройки фона */}
        <motion.div
          className="flex justify-end mb-3"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => dispatch(toggleBackgroundEditor())}
            className="px-3 py-1.5 text-xs rounded transition-all duration-150"
            style={{
              background: 'var(--dp-bg-card)',
              color:      'var(--dp-text-secondary)',
              border:     '1px solid var(--dp-border)',
              cursor:     'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color       = 'var(--dp-text-white)'
              e.currentTarget.style.borderColor = 'var(--dp-border-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color       = 'var(--dp-text-secondary)'
              e.currentTarget.style.borderColor = 'var(--dp-border)'
            }}
          >
            🎨 Настроить фон
          </button>
        </motion.div>

        {/* Два столбца — появляются каскадом */}
        <div className="flex gap-4 items-start">

          {/*
            staggerContainerVariants — дочерние элементы появляются
            по очереди с задержкой 0.07s между каждым.
          */}
          <motion.div
            className="flex-1 min-w-0 flex flex-col gap-4"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {leftColumn}
          </motion.div>

          <motion.div
            className="w-[230px] shrink-0 flex flex-col gap-4"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            transition={{ delayChildren: 0.15 }}
          >
            {rightColumn}
          </motion.div>

        </div>
      </div>
    </div>
  )
}

// Переэкспортируем для использования в дочерних компонентах
export { fadeVariants } from '../../../hooks/useAnimatedMount'