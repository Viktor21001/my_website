import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import type { Workout } from '../../../types/fitness'

function formatWorkoutDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function WorkoutCard({ workout }: { workout: Workout }) {
  const totalSets = workout.sets.length
  const topSet = workout.sets.reduce(
    (max, s) => (s.weightKg > max.weightKg ? s : max),
    workout.sets[0]
  )

  return (
    <motion.div
      className="flex gap-3 p-3 cursor-pointer"
      style={{ background: 'var(--dp-bg-card)', borderBottom: '1px solid var(--dp-border)' }}
      variants={staggerItemVariants}
      whileHover={{ backgroundColor: 'var(--dp-bg-card-hover)' }}
    >
      {/* Иконка тренировки */}
      <div
        className="shrink-0 flex items-center justify-center rounded"
        style={{ width: 46, height: 46, background: 'var(--dp-border)', borderRadius: 'var(--dp-radius-sm)' }}
      >
        <span style={{ fontSize: 20 }}>🏋️</span>
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--dp-text-primary)' }}>
          {workout.title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--dp-text-muted)' }}>
          {formatWorkoutDate(workout.date)} · {totalSets} подход{totalSets === 1 ? '' : totalSets < 5 ? 'а' : 'ов'}
        </div>
        {topSet && (
          <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
            лучший подход: {topSet.exerciseName} {topSet.weightKg > 0 ? `${topSet.weightKg}кг` : ''} × {topSet.reps}
          </div>
        )}
      </div>

      {/* Длительность */}
      <div className="shrink-0 text-right">
        <div className="text-xs font-mono font-medium" style={{ color: 'var(--dp-text-code)' }}>
          {workout.durationMin} мин
        </div>
      </div>
    </motion.div>
  )
}
