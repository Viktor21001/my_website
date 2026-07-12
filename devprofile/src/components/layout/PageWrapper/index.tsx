/*
  PageWrapper — адаптивный двухколоночный layout.
  Мобильный: колонки складываются в стек.
  Планшет: правая колонка сужается.
  Десктоп: полный Steam-подобный layout.
*/

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch } from '../../../hooks/redux'
import { toggleBackgroundEditor } from '../../../store/slices/uiSlice'
import { fadeUpVariants, staggerContainerVariants, staggerItemVariants } from '../../../hooks/useAnimatedMount'

interface PageWrapperProps {
  header:        ReactNode
  leftColumn:    ReactNode
  rightColumn:   ReactNode
  isOwnProfile?: boolean
}

export function PageWrapper({
  header,
  leftColumn,
  rightColumn,
  isOwnProfile = false,
}: PageWrapperProps) {
  const dispatch = useAppDispatch()

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-[990px] mx-auto px-3 sm:px-4 pb-10">

        {/* Шапка */}
        <motion.div
          className="mb-3"
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          {header}
        </motion.div>

        {/* Кнопка фона — только владелец */}
        {isOwnProfile && (
          <motion.div
            className="flex justify-end mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.25 }}
          >
            <button
              onClick={() => dispatch(toggleBackgroundEditor())}
              className="dp-btn-ghost text-xs"
            >
              🎨 Настроить фон
            </button>
          </motion.div>
        )}

        {/*
          Адаптивный layout:
          — мобильный (< 768px): один столбец
          — десктоп: два столбца, правый фиксированный 230px
        */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">

          {/* Левый столбец — основной контент */}
          <motion.div
            className="w-full md:flex-1 md:min-w-0 flex flex-col gap-3"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {leftColumn}
          </motion.div>

          {/* Правый столбец */}
          <motion.div
            className="w-full md:w-[230px] md:shrink-0 flex flex-col gap-3"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            transition={{ delayChildren: 0.12 }}
          >
            {rightColumn}
          </motion.div>

        </div>
      </div>
    </div>
  )
}

export { staggerItemVariants }