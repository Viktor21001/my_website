/*
  ProfileOverview — компактная сводка "обеих сторон" профиля рядом:
  Dev-уровень (state.profile) и Fitness-уровень (state.fitness) — два
  независимых трека прокачки, которые сегодня показываются только
  порознь (ProfileHeader — только Dev, FitnessStatsStrip — только
  Fitness). Ничего не запрашивает — оба значения уже в Redux.
  Дефолтный виджет вкладки General, узкая правая колонка (230px).
*/

import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { xpProgressPercent, XP_PER_LEVEL } from '../../../config/constants'
import { PanelHeader } from '../../shared/PanelHeader'

export function ProfileOverview() {
  const dev = useAppSelector((state) => state.profile)
  const fitness = useAppSelector((state) => state.fitness)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <PanelHeader title="Обзор" />
      <div className="p-3 flex flex-col gap-3">
        <LevelRow label="Dev" icon="💻" level={dev.level} xp={dev.xp} color="var(--dp-accent)" colorDim="var(--dp-accent-dim)" />
        <LevelRow label="Fitness" icon="🏋️" level={fitness.level} xp={fitness.xp} color="var(--dp-green)" colorDim="var(--dp-green-dim)" />
      </div>
    </motion.div>
  )
}

function LevelRow({
  label, icon, level, xp, color, colorDim,
}: {
  label: string
  icon: string
  level: number
  xp: number
  color: string
  colorDim: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: `linear-gradient(135deg, ${colorDim}, ${color})`,
          color: '#0e1621',
        }}
      >
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs flex items-center gap-1" style={{ color: 'var(--dp-text-secondary)' }}>
          <span style={{ fontSize: 10 }}>{icon}</span>
          {label}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'var(--dp-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${colorDim}, ${color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${xpProgressPercent(xp)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--dp-text-muted)' }}>
          {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
        </div>
      </div>
    </div>
  )
}
