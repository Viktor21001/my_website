/*
  AddWorkoutForm — добавление тренировки. По умолчанию полностью ручной
  режим: Название, Место, Длительность, затем список подходов (упражнение
  из открывающегося списка + вес/повторы), который стартует пустым — ничего
  не подбирается автоматически. Ниже — отдельная плашка «Сгенерировать
  тренировку»: раскрывает Тип тренировки + Уровень подготовки и кнопку
  «Сгенерировать», которая ОДИН РАЗ, по явному клику, заполняет список
  подходов через уже существующий generateWorkoutPlan (workoutGenerator.ts).
  До этого клика генератор не трогает форму вообще.

  Вес в строке подставляется правилом из workoutWeights.ts: для
  bodyweightOnly-упражнений — вес тела из последнего замера (не
  редактируется руками), для остальных — последний использованный вес
  этого упражнения (редактируется). Для isTimeBased-упражнений (планка,
  бег и т.п.) то же поле reps на самом деле хранит минуты — только
  подпись и рендер отличаются, схема WorkoutSet не меняется.

  «Утвердить тренировку» сохраняет тренировку как обычно (POST /workouts)
  и через onConfirm просит родителя (WorkoutLog) открыть WorkoutPlayer —
  сам плеер и его состояние теперь живут в WorkoutLog, т.к. его также
  открывает кнопка «Повторить» на карточках истории (WorkoutCard).

  Плавание — полностью изолированный под-режим (тумблер «Плавание»),
  не пересекается ни с генерацией, ни с весом/повторами, ни с плеером:
  стиль + количество бассейнов на стиль, сохраняется напрямую.
*/

import { useState } from 'react'
import { useExercises, useWorkouts, useMeasurements, useAddWorkoutMutation } from '../../../hooks/useFitnessData'
import { extractApiError } from '../../../utils/apiError'
import { assignSetNumbers, type SetRowInput } from '../../../utils/workoutSets'
import { buildRowsForExercises, resolveRowWeight } from '../../../utils/workoutWeights'
import {
  DURATIONS,
  DEFAULT_REST_SECONDS,
  WORKOUT_GOAL_LABELS,
  LOCATION_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  SWIM_STYLE_LABELS,
  isLocationAllowed,
  generateWorkoutPlan,
  buildSwimmingWorkout,
} from '../../../utils/workoutGenerator'
import type { PlayerStep } from '../WorkoutPlayer'
import type { WorkoutGoal, WorkoutLocation, ExperienceLevel, SwimStyle, SwimStyleEntry } from '../../../types/fitness'

const TODAY = () => new Date().toISOString().slice(0, 10)
const EMPTY_ROW: SetRowInput = { exerciseId: '', reps: '', weightKg: '' }

export function AddWorkoutForm({
  onConfirm,
}: {
  onConfirm: (launch: { steps: PlayerStep[]; restSeconds: number }) => void
}) {
  const { exercises } = useExercises()
  const { workouts } = useWorkouts()
  const { measurements } = useMeasurements()
  const [addWorkout, { isLoading, error }] = useAddWorkoutMutation()

  const [open, setOpen] = useState(false)
  const [isSwimming, setIsSwimming] = useState(false)
  const [date, setDate] = useState(TODAY())
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState<WorkoutLocation>('home')
  const [durationMin, setDurationMin] = useState<number>(60)
  const [rows, setRows] = useState<SetRowInput[]>([{ ...EMPTY_ROW }])
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST_SECONDS)

  const [genOpen, setGenOpen] = useState(false)
  const [goal, setGoal] = useState<WorkoutGoal>('weight_loss')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner')

  const [swimPoolLengthM, setSwimPoolLengthM] = useState(25)
  const [swimDurationMin, setSwimDurationMin] = useState(60)
  const [swimStyles, setSwimStyles] = useState<SwimStyleEntry[]>([{ style: 'crawl', lengths: 0 }])

  // Список упражнений в строке — по месту, без фильтра по уровню: ручной
  // ввод описывает то, что реально сделано, а не то, что «рекомендуется»
  const catalog = exercises.filter((e) => e.name !== 'Плавание' && isLocationAllowed(e, location))

  function resetForm() {
    setIsSwimming(false)
    setDate(TODAY())
    setTitle('')
    setLocation('home')
    setDurationMin(60)
    setRows([{ ...EMPTY_ROW }])
    setRestSeconds(DEFAULT_REST_SECONDS)
    setGenOpen(false)
    setGoal('weight_loss')
    setExperienceLevel('beginner')
    setSwimPoolLengthM(25)
    setSwimDurationMin(60)
    setSwimStyles([{ style: 'crawl', lengths: 0 }])
  }

  // Единственная точка, где вообще что-то генерируется — по явному клику
  function handleGenerateClick() {
    const plan = generateWorkoutPlan({ goal, location, durationMin, experienceLevel, exercises, recentWorkouts: workouts })
    const newRows = buildRowsForExercises(
      plan.exerciseIds, plan.setsPerExercise, plan.repsMin, plan.repsMax, durationMin, exercises, measurements, workouts
    )
    setRows(newRows.length > 0 ? newRows : [{ ...EMPTY_ROW }])
    setRestSeconds(plan.restSeconds)
    setTitle(WORKOUT_GOAL_LABELS[goal])
  }

  function handleRowExerciseChange(index: number, exerciseId: string) {
    const exercise = exercises.find((e) => e.id === exerciseId)
    const weightKg = exercise ? String(resolveRowWeight(exercise, measurements, workouts)) : ''
    setRows((r) => r.map((row, i) => (i === index ? { exerciseId, reps: row.reps, weightKg } : row)))
  }
  function updateRow(index: number, field: keyof SetRowInput, value: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }
  function addRow() {
    setRows((r) => [...r, { ...EMPTY_ROW }])
  }
  function removeRow(index: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== index) : r))
  }

  function updateSwimStyle(index: number, field: keyof SwimStyleEntry, value: string) {
    setSwimStyles((s) => s.map((row, i) => (
      i === index ? { ...row, [field]: field === 'lengths' ? Number(value) : value } : row
    )))
  }
  function addSwimStyle() {
    setSwimStyles((s) => [...s, { style: 'crawl', lengths: 0 }])
  }
  function removeSwimStyle(index: number) {
    setSwimStyles((s) => (s.length > 1 ? s.filter((_, i) => i !== index) : s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rows.some((r) => !r.exerciseId || Number.isNaN(Number(r.reps)) || Number.isNaN(Number(r.weightKg)))) {
      return
    }

    const steps: PlayerStep[] = rows.map((r) => {
      const exercise = exercises.find((e) => e.id === r.exerciseId)
      return {
        exerciseName: exercise?.name ?? '',
        isTimeBased: exercise?.isTimeBased ?? false,
        target: Number(r.reps),
        weightKg: Number(r.weightKg),
        bodyweightOnly: exercise?.bodyweightOnly ?? false,
      }
    })

    try {
      await addWorkout({
        date: new Date(date).toISOString(),
        title,
        durationMin,
        sets: assignSetNumbers(rows),
      }).unwrap()
      onConfirm({ steps, restSeconds })
      resetForm()
      setOpen(false)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  async function handleSwimSubmit() {
    const workout = buildSwimmingWorkout(new Date(date).toISOString(), swimDurationMin, swimPoolLengthM, swimStyles, exercises)
    if (!workout) return
    try {
      await addWorkout(workout).unwrap()
      resetForm()
      setOpen(false)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  if (!open) {
    return (
      <div className="p-3" style={{ borderBottom: '1px solid var(--dp-border)' }}>
        <button onClick={() => setOpen(true)} className="dp-btn-ghost text-xs">
          + Добавить тренировку
        </button>
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--dp-border)' }}>
      <button
        type="button"
        onClick={() => setIsSwimming((v) => !v)}
        className="text-xs px-2 py-1 rounded self-start"
        style={{
          background: isSwimming ? 'var(--dp-bg-card-hover)' : 'transparent',
          border: `1px solid ${isSwimming ? 'var(--dp-border-accent)' : 'var(--dp-border)'}`,
          color: isSwimming ? 'var(--dp-accent-bright)' : 'var(--dp-text-secondary)',
        }}
      >
        {isSwimming ? '✓ Плавание' : 'Плавание'}
      </button>

      <input
        type="date" className="dp-input text-xs" value={date}
        onChange={(e) => setDate(e.target.value)} required
      />

      {isSwimming ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Длина бассейна, м" className="dp-input text-xs"
              value={swimPoolLengthM} onChange={(e) => setSwimPoolLengthM(Number(e.target.value))}
            />
            <select
              className="dp-input text-xs"
              value={swimDurationMin}
              onChange={(e) => setSwimDurationMin(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} мин</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            {swimStyles.map((s, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <select
                  className="dp-input text-xs col-span-2"
                  value={s.style}
                  onChange={(e) => updateSwimStyle(i, 'style', e.target.value as SwimStyle)}
                >
                  {(Object.keys(SWIM_STYLE_LABELS) as SwimStyle[]).map((style) => (
                    <option key={style} value={style}>{SWIM_STYLE_LABELS[style]}</option>
                  ))}
                </select>
                <input
                  type="number" placeholder="Бассейнов" className="dp-input text-xs"
                  value={s.lengths || ''} onChange={(e) => updateSwimStyle(i, 'lengths', e.target.value)}
                />
                <button
                  type="button" onClick={() => removeSwimStyle(i)}
                  className="dp-btn-ghost text-xs shrink-0" aria-label="Удалить стиль"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSwimStyle} className="dp-btn-ghost text-xs self-start">
            + Стиль
          </button>

          {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить тренировку')}</div>}

          <div className="flex gap-2">
            <button type="button" onClick={handleSwimSubmit} className="dp-btn-primary text-xs" disabled={isLoading}>
              {isLoading ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button type="button" className="dp-btn-ghost text-xs" onClick={() => setOpen(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text" placeholder="Название" className="dp-input text-xs" value={title}
              onChange={(e) => setTitle(e.target.value)} required
            />
            <select
              className="dp-input text-xs"
              value={location}
              onChange={(e) => setLocation(e.target.value as WorkoutLocation)}
            >
              {(Object.keys(LOCATION_LABELS) as WorkoutLocation[]).map((l) => (
                <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
              ))}
            </select>
            <select
              className="dp-input text-xs"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} мин</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) => {
              const exercise = exercises.find((e) => e.id === row.exerciseId)
              const isTimeBased = exercise?.isTimeBased ?? false
              const isBodyweight = exercise?.bodyweightOnly ?? false
              return (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <select
                    className="dp-input text-xs col-span-2"
                    value={row.exerciseId}
                    onChange={(e) => handleRowExerciseChange(i, e.target.value)}
                    required
                  >
                    <option value="">Упражнение…</option>
                    {catalog.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                  <input
                    type="number" placeholder={isTimeBased ? 'Время, мин' : 'Повторы'} className="dp-input text-xs"
                    value={row.reps} onChange={(e) => updateRow(i, 'reps', e.target.value)} required
                  />
                  <div className="flex gap-1">
                    <input
                      type="number" step="0.5" placeholder={isBodyweight ? 'Свой вес' : 'Вес, кг'}
                      className="dp-input text-xs" value={row.weightKg} disabled={isBodyweight}
                      onChange={(e) => updateRow(i, 'weightKg', e.target.value)} required
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="dp-btn-ghost text-xs shrink-0"
                      aria-label="Удалить подход"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button type="button" onClick={addRow} className="dp-btn-ghost text-xs self-start">
            + Подход
          </button>

          {/* Плашка «Сгенерировать тренировку» — до клика на «Сгенерировать» ниже ничего не подбирается */}
          <div
            className="flex flex-col gap-2 p-2"
            style={{ border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-sm)' }}
          >
            <button
              type="button"
              onClick={() => setGenOpen((v) => !v)}
              className="dp-btn-ghost text-xs self-start"
            >
              {genOpen ? '− Сгенерировать тренировку' : '+ Сгенерировать тренировку'}
            </button>

            {genOpen && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="dp-input text-xs"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as WorkoutGoal)}
                  >
                    {(Object.keys(WORKOUT_GOAL_LABELS) as WorkoutGoal[]).map((g) => (
                      <option key={g} value={g}>{WORKOUT_GOAL_LABELS[g]}</option>
                    ))}
                  </select>
                  <select
                    className="dp-input text-xs"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  >
                    {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map((l) => (
                      <option key={l} value={l}>{EXPERIENCE_LEVEL_LABELS[l]}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                  Место и длительность берутся из полей выше. Список подходов будет полностью заменён.
                </div>
                <button type="button" onClick={handleGenerateClick} className="dp-btn-primary text-xs self-start">
                  Сгенерировать
                </button>
              </>
            )}
          </div>

          {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить тренировку')}</div>}

          <div className="flex gap-2">
            <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
              {isLoading ? 'Сохраняем…' : 'Утвердить тренировку'}
            </button>
            <button type="button" className="dp-btn-ghost text-xs" onClick={() => setOpen(false)}>
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
