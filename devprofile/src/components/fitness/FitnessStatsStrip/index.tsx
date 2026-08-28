/*
  FitnessStatsStrip — аналог блока "Коллекционер игр" в Steam-профиле:
  большие числа-счётчики + отдельный уровень/XP фитнес-профиля
  (независимый от dev-уровня в ProfileHeader).
*/

import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { xpProgressPercent, XP_PER_LEVEL } from '../../../config/constants'
import { longestDailyStreak } from '../../../utils/fitnessCalc'

export function FitnessStatsStrip() {
  const { workouts, measurements, inbodyResults, level, xp } = useAppSelector(
    (state) => state.fitness
  )
  const streakDays = longestDailyStreak(workouts.map((w) => w.date))

  const stats = [
    { value: workouts.length, label: 'Тренировки' },
    { value: measurements.length, label: 'Замеры' },
    { value: inbodyResults.length, label: 'InBody' },
    { value: streakDays, label: 'Дней подряд' },
  ]

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">Мой прогресс</div>

      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Уровень + XP */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--dp-green-dim), var(--dp-green))',
              color: '#0e1621',
              boxShadow: '0 2px 8px rgba(139,195,74,0.35)',
            }}
          >
            {level}
          </div>
          <div style={{ width: 120 }}>
            <div
              className="text-xs uppercase tracking-wider mb-1"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              Уровень
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--dp-border)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--dp-green-dim), var(--dp-green))' }}
                initial={{ width: 0 }}
                animate={{ width: `${xpProgressPercent(xp)}%` }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="text-xs mt-1 font-mono" style={{ color: 'var(--dp-text-muted)' }}>
              {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
            </div>
          </div>
        </div>

        {/* Счётчики */}
        <div className="flex-1 grid grid-cols-4 gap-2 w-full">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-semibold" style={{ color: 'var(--dp-text-white)' }}>
                {s.value}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: 'var(--dp-text-secondary)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
