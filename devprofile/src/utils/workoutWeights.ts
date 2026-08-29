/*
  workoutWeights.ts — подстановка веса в строку подхода:
  - для bodyweightOnly-упражнений вес не вводится руками, это вес тела
    из последнего замера (вкладка «Замеры»);
  - для остальных — вес последнего использования этого же упражнения
    в прошлых тренировках, чтобы не вводить его каждый раз заново.
*/

import type { BodyMeasurement, Exercise, Workout } from '../types/fitness'
import type { SetRowInput } from './workoutSets'
import { sortByDateAsc } from './fitnessCalc'

export function getLatestBodyWeight(measurements: BodyMeasurement[]): number | undefined {
  if (measurements.length === 0) return undefined
  const chronological = sortByDateAsc(measurements)
  return chronological[chronological.length - 1].weightKg
}

// workouts приходит с сервера отсортированным по дате убыв. (orderBy: date desc),
// поэтому первое совпадение по exerciseId — самое недавнее использование
export function getLastUsedWeight(exerciseId: string, workouts: Workout[]): number | undefined {
  for (const workout of workouts) {
    const set = workout.sets.find((s) => s.exerciseId === exerciseId)
    if (set) return set.weightKg
  }
  return undefined
}

// Вес для строки подхода по правилу: bodyweightOnly — вес тела (не вводится
// руками), иначе — последний использованный вес этого упражнения (можно
// поменять руками)
export function resolveRowWeight(exercise: Exercise, measurements: BodyMeasurement[], workouts: Workout[]): number {
  if (exercise.bodyweightOnly) return getLatestBodyWeight(measurements) ?? 0
  return getLastUsedWeight(exercise.id, workouts) ?? 0
}

// Время (мин) на один подход isTimeBased-упражнения — делим общий бюджет
// тренировки (durationMin) поровну между всеми подходами пресета, чтобы
// сумма реально укладывалась в выбранную длительность, а не была
// фиксированным числом, не зависящим от неё. Планка и подобные упражнения
// на пресс/кор — всегда короткие удержания, даже в длинной тренировке,
// поэтому для них берём меньшее из общей доли и небольшого потолка.
function defaultTimeBasedMinutes(exercise: Exercise, minutesPerSlot: number): number {
  const share = Math.max(1, minutesPerSlot)
  return exercise.muscleGroup === 'core' ? Math.min(2, share) : share
}

// Строит строки подходов под сгенерированный пресет: по setsPerExercise
// строк на каждое упражнение, с вычисленным вручную не редактируемым весом
// тела для bodyweightOnly, последним использованным весом для остальных, и
// временем (мин, пропорциональным выбранной длительности тренировки) вместо
// повторов для isTimeBased-упражнений
export function buildRowsForExercises(
  exerciseIds: string[],
  setsPerExercise: number,
  repsMin: number,
  repsMax: number,
  durationMin: number,
  exercises: Exercise[],
  measurements: BodyMeasurement[],
  workouts: Workout[]
): SetRowInput[] {
  const byId = new Map(exercises.map((e) => [e.id, e] as const))
  const midReps = Math.round((repsMin + repsMax) / 2)
  const totalSlots = Math.max(1, exerciseIds.length * setsPerExercise)
  const minutesPerSlot = Math.round(durationMin / totalSlots)
  const rows: SetRowInput[] = []

  for (const exerciseId of exerciseIds) {
    const exercise = byId.get(exerciseId)
    if (!exercise) continue
    const weight = resolveRowWeight(exercise, measurements, workouts)
    const reps = exercise.isTimeBased ? defaultTimeBasedMinutes(exercise, minutesPerSlot) : midReps
    for (let i = 0; i < setsPerExercise; i++) {
      rows.push({ exerciseId, reps: String(reps), weightKg: String(weight) })
    }
  }

  return rows
}
