/*
  WorkoutLog — центральная панель фитнес-раздела: локальные вкладки
  Тренировки / Замеры / InBody. Структурный клон табов из
  components/activity/RecentActivity (та же анимация подчёркивания).
*/

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants, fadeVariants } from '../../../hooks/useAnimatedMount'
import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { extractApiError } from '../../../utils/apiError'
import { useWorkouts, useInBodyResults, useExercises, useMeasurements, useAddWorkoutMutation } from '../../../hooks/useFitnessData'
import { getLatestBodyWeight } from '../../../utils/workoutWeights'
import { SWIMMING_EXERCISE_NAME, DEFAULT_REST_SECONDS } from '../../../utils/workoutGenerator'
import { WorkoutCard } from '../WorkoutCard'
import { MeasurementsHistory } from '../MeasurementsHistory'
import { AddWorkoutForm } from '../AddWorkoutForm'
import { AddInBodyForm } from '../AddInBodyForm'
import { WorkoutPlayer, type PlayerStep } from '../WorkoutPlayer'
import { EmptyCard } from '../../shared/Card'
import { PanelHeader } from '../../shared/PanelHeader'
import type { Workout } from '../../../types/fitness'

type Tab = 'workouts' | 'measurements' | 'inbody'

// Список тренировок не растягивает блок бесконечно — высота ограничена
// пятью карточками (реальная высота одной карточки WorkoutCard — ~70px),
// при большем числе тренировок появляется прокрутка внутри блока
const WORKOUT_CARD_HEIGHT = 70
const MAX_VISIBLE_WORKOUTS = 5

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'workouts',     label: 'Тренировки', icon: '🏋️' },
  { id: 'measurements', label: 'Замеры',      icon: '📏' },
  { id: 'inbody',       label: 'InBody',      icon: '🔬' },
]

interface PlayerLaunch {
  steps: PlayerStep[]
  restSeconds: number
}

export function WorkoutLog() {
  const [activeTab, setActiveTab] = useState<Tab>('workouts')

  const { workouts } = useWorkouts()
  const { inbodyResults } = useInBodyResults()
  const { exercises } = useExercises()
  const { measurements } = useMeasurements()
  const [addWorkout, { error: repeatError }] = useAddWorkoutMutation()

  const [player, setPlayer] = useState<PlayerLaunch | null>(null)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)

  // По дате тренировки, а при совпадении (несколько тренировок за один день,
  // у всех date == полночь UTC того дня) — по времени создания записи, чтобы
  // только что добавленная тренировка всегда была выше остальных за этот день
  const workoutsDesc = [...workouts].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const inbodyDesc = sortByDateAsc(inbodyResults).reverse()

  // Повтор тренировки из истории: пересохраняет тот же набор подходов с
  // сегодняшней датой и сразу открывает плеер — то же самое, что делает
  // «Утвердить тренировку» в AddWorkoutForm, только вход из карточки
  // истории. Плавание в плеер не заходит — просто пересохраняется как есть,
  // как и при обычном добавлении.
  async function handleRepeat(workout: Workout) {
    setRepeatingId(workout.id)
    try {
      const isSwim = workout.sets.every((s) => s.exerciseName === SWIMMING_EXERCISE_NAME)
      if (isSwim) {
        await addWorkout({
          date: new Date().toISOString(),
          title: workout.title,
          durationMin: workout.durationMin,
          notes: workout.notes,
          sets: workout.sets.map((s) => ({
            exerciseId: s.exerciseId, setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg,
          })),
        }).unwrap()
        return
      }

      const sets = workout.sets.map((s) => {
        const exercise = exercises.find((e) => e.id === s.exerciseId)
        // Вес тела мог измениться со времени первой тренировки — берём актуальный
        const weightKg = exercise?.bodyweightOnly ? (getLatestBodyWeight(measurements) ?? s.weightKg) : s.weightKg
        return { exerciseId: s.exerciseId, setNumber: s.setNumber, reps: s.reps, weightKg }
      })

      await addWorkout({
        date: new Date().toISOString(),
        title: workout.title,
        durationMin: workout.durationMin,
        sets,
      }).unwrap()

      const steps: PlayerStep[] = sets.map((s) => {
        const exercise = exercises.find((e) => e.id === s.exerciseId)
        return {
          exerciseName: exercise?.name ?? '',
          isTimeBased: exercise?.isTimeBased ?? false,
          target: s.reps,
          weightKg: s.weightKg,
          bodyweightOnly: exercise?.bodyweightOnly ?? false,
        }
      })
      setPlayer({ steps, restSeconds: DEFAULT_REST_SECONDS })
    } catch {
      // ошибка уже отражена через repeatError ниже
    } finally {
      setRepeatingId(null)
    }
  }

  return (
    <>
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <PanelHeader
        title="Дневник тренировок"
        right={
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-all duration-150"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
                }}
              >
                <span style={{ fontSize: 10 }}>{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--dp-green)' }}
                    layoutId="activeFitnessTab"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </button>
            ))}
          </div>
        }
      />

      {/*
        Контент вкладок — variants вместо своих initial/animate: тван на
        key={activeTab}-ремаунте застревал в initial (opacity:0) до наведения
        мышью (см. такой же фикс в RecentActivity). Через variants состояние
        читается из контекста родителя, а не из своего же эффекта.
      */}
      <motion.div key={activeTab} variants={fadeVariants}>
        {activeTab === 'workouts' && (
          <div className="flex flex-col">
            <AddWorkoutForm onConfirm={setPlayer} />
            {repeatError && (
              <div className="dp-error mx-3">{extractApiError(repeatError, 'Не удалось повторить тренировку')}</div>
            )}
            {workoutsDesc.length === 0 ? (
              <EmptyCard message="Тренировок пока нет" />
            ) : (
              <div
                style={
                  workoutsDesc.length > MAX_VISIBLE_WORKOUTS
                    ? { maxHeight: WORKOUT_CARD_HEIGHT * MAX_VISIBLE_WORKOUTS, overflowY: 'auto' }
                    : undefined
                }
              >
                {workoutsDesc.map((w) => (
                  <WorkoutCard key={w.id} workout={w} onRepeat={handleRepeat} isRepeating={repeatingId === w.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'measurements' && <MeasurementsHistory />}

        {activeTab === 'inbody' && (
          <div className="flex flex-col">
            <AddInBodyForm />
            {inbodyDesc.length === 0
              ? <EmptyCard message="Сканов InBody пока нет" />
              : (
              <div className="flex flex-col">
                {inbodyDesc.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 text-xs"
                    style={{ borderBottom: '1px solid var(--dp-border)' }}
                  >
                    <div className="shrink-0 w-20 font-mono" style={{ color: 'var(--dp-text-muted)' }}>
                      {new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Stat label="Вес" value={`${r.weightKg} кг`} />
                      <Stat label="Жир" value={`${r.bodyFatPercent}%`} />
                      <Stat label="Мышцы" value={`${r.muscleMassKg} кг`} />
                      <Stat label="Вода" value={`${r.bodyWaterPercent}%`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
    {player && <WorkoutPlayer steps={player.steps} restSeconds={player.restSeconds} onClose={() => setPlayer(null)} />}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--dp-text-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>{label}</div>
    </div>
  )
}
