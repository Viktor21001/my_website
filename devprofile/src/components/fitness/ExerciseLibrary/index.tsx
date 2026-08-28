import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useExercises } from '../../../hooks/useFitnessData'
import type { MuscleGroup } from '../../../types/fitness'

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Пресс',
  cardio: 'Кардио',
}

export function ExerciseLibrary() {
  const { exercises } = useExercises()

  const groups = (Object.keys(GROUP_LABELS) as MuscleGroup[])
    .map((g) => ({ group: g, items: exercises.filter((e) => e.muscleGroup === g) }))
    .filter((g) => g.items.length > 0)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">
        Библиотека упражнений{' '}
        <span style={{ color: 'var(--dp-accent)' }}>{exercises.length}</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <div
              className="text-xs uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              {GROUP_LABELS[group]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((e) => (
                <span
                  key={e.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: 'var(--dp-bg-card)',
                    border: '1px solid var(--dp-border)',
                    color: 'var(--dp-text-primary)',
                  }}
                >
                  {e.name}
                  {e.equipment && (
                    <span style={{ color: 'var(--dp-text-muted)' }}> · {e.equipment}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
