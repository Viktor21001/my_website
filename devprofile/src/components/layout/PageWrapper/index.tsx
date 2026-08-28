/*
  PageWrapper — адаптивный двухколоночный layout.
  Мобильный: колонки складываются в стек.
  Планшет: правая колонка сужается.
  Десктоп: полный Steam-подобный layout.
*/

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeUpVariants, staggerContainerVariants, staggerItemVariants } from '../../../hooks/useAnimatedMount'

interface PageWrapperProps {
  header:      ReactNode
  leftColumn:  ReactNode
  rightColumn: ReactNode
}

export function PageWrapper({ header, leftColumn, rightColumn }: PageWrapperProps) {
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