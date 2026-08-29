/*
  workoutGenerator.ts — «мозг» конструктора тренировок (WorkoutBuilder).
  Чистые функции, без React: подбирают упражнения из каталога под
  Место + Цель + Длительность + Уровень подготовки.

  Отбор детерминированный (стабильная сортировка по имени), не
  Math.random() — иначе чек-лист «мигал» бы при каждом пересчёте
  пресета (смена длительности и т.п.), и функцию было бы не
  протестировать без мока рандома.

  Плавание — отдельная, изолированная функция (buildSwimmingWorkout),
  не участвует в generateWorkoutPlan и никогда не смешивается со
  списком обычных упражнений.
*/

import type {
  Exercise,
  MuscleGroup,
  NewWorkout,
  NewWorkoutSet,
  SwimStyle,
  SwimStyleEntry,
  Workout,
  WorkoutGoal,
  WorkoutLocation,
  ExperienceLevel,
} from '../types/fitness'

export const SWIMMING_EXERCISE_NAME = 'Плавание'

export const SWIM_STYLE_LABELS: Record<SwimStyle, string> = {
  crawl: 'Кроль',
  breaststroke: 'Брасс',
  backstroke: 'На спине',
  butterfly: 'Баттерфляй',
}

export const WORKOUT_GOAL_LABELS: Record<WorkoutGoal, string> = {
  weight_loss: 'Похудение',
  lean_toning: 'Похудение с рельефом',
  muscle_gain: 'Массонабор',
  strength: 'Силовая',
}

export const LOCATION_LABELS: Record<WorkoutLocation, string> = {
  home: 'Дома',
  gym: 'В зале',
}

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export const DURATIONS = [30, 45, 60, 90, 120] as const

// Отдых между подходами, когда у тренировки нет привязанного профиля цели
// (ручное добавление без генерации, повтор старой тренировки из истории)
export const DEFAULT_REST_SECONDS = 60

const LEVEL_RANK: Record<ExperienceLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 }

const EXERCISE_COUNT_BY_DURATION: Record<number, number> = { 30: 4, 45: 5, 60: 6, 90: 8, 120: 10 }

interface GoalProfile {
  repsMin: number
  repsMax: number
  restSeconds: number
  setsPerExercise: number
  formatNote: string
}

const GOAL_PROFILES: Record<WorkoutGoal, GoalProfile> = {
  weight_loss: {
    repsMin: 12,
    repsMax: 20,
    restSeconds: 30,
    setsPerExercise: 3,
    formatNote: 'Кардио и ВИИТ в приоритете, силовые — лёгкая поддержка.',
  },
  lean_toning: {
    repsMin: 10,
    repsMax: 15,
    restSeconds: 20,
    setsPerExercise: 3,
    formatNote: 'Круговой формат, минимальный отдых. Рабочий вес — ориентировочно на 10–15% ниже обычного.',
  },
  muscle_gain: {
    repsMin: 6,
    repsMax: 10,
    restSeconds: 105,
    setsPerExercise: 4,
    formatNote: 'Базовые многосуставные упражнения — первыми. Прогрессия нагрузки от тренировки к тренировке.',
  },
  strength: {
    repsMin: 3,
    repsMax: 6,
    restSeconds: 150,
    setsPerExercise: 5,
    formatNote: 'Свободные веса, строгая прогрессия. Одна и та же группа мышц — не чаще раза в 48–72 часа.',
  },
}

// Дефолтная ротация групп мышц для силовых, когда истории тренировок ещё нет
const DEFAULT_MUSCLE_GROUP_ROTATION: MuscleGroup[] = ['legs', 'back', 'chest', 'shoulders', 'arms', 'core']
const STRENGTH_MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

function byName(a: Exercise, b: Exercise): number {
  return a.name.localeCompare(b.name, 'ru')
}

export function isLevelAllowed(exercise: Exercise, level: ExperienceLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[exercise.minLevel]
}

export function isLocationAllowed(exercise: Exercise, location: WorkoutLocation): boolean {
  return location === 'gym' || exercise.homeFriendly
}

// Весь каталог (без «Плавание»), отфильтрованный по месту и уровню — это то,
// из чего конструктор строит видимый чек-лист (шире, чем один сгенерированный пресет)
export function eligibleCatalog(
  exercises: Exercise[],
  location: WorkoutLocation,
  level: ExperienceLevel
): Exercise[] {
  return exercises
    .filter((e) => e.name !== SWIMMING_EXERCISE_NAME && isLocationAllowed(e, location) && isLevelAllowed(e, level))
    .sort(byName)
}

function exerciseCountForDuration(durationMin: number): number {
  return EXERCISE_COUNT_BY_DURATION[durationMin] ?? Math.max(3, Math.round(durationMin / 12))
}

// Добавляет упражнения из pool, пока не наберётся count (без дублей); может
// вернуть меньше count, если подходящих упражнений в каталоге не хватает
function fillTo(selected: Exercise[], pool: Exercise[], count: number): Exercise[] {
  const result = [...selected]
  const usedIds = new Set(result.map((e) => e.id))
  for (const ex of pool) {
    if (result.length >= count) break
    if (usedIds.has(ex.id)) continue
    usedIds.add(ex.id)
    result.push(ex)
  }
  return result.slice(0, count)
}

function pickAcrossMuscleGroups(pool: Exercise[], count: number): Exercise[] {
  const byGroup = new Map<MuscleGroup, Exercise[]>()
  for (const ex of pool) {
    const list = byGroup.get(ex.muscleGroup) ?? []
    list.push(ex)
    byGroup.set(ex.muscleGroup, list)
  }
  const groups = [...byGroup.keys()].sort()
  const result: Exercise[] = []
  let round = 0
  while (result.length < count) {
    let addedThisRound = false
    for (const group of groups) {
      if (result.length >= count) break
      const list = byGroup.get(group)!
      if (round < list.length) {
        result.push(list[round])
        addedThisRound = true
      }
    }
    if (!addedThisRound) break
    round++
  }
  return result
}

function pickWeightLoss(pool: Exercise[], count: number): Exercise[] {
  const cardio = pool.filter((e) => e.muscleGroup === 'cardio')
  const support = pool.filter((e) => e.muscleGroup !== 'cardio' && !e.compound)
  const cardioCount = Math.max(1, Math.round(count * 0.7))
  return fillTo([...cardio.slice(0, cardioCount), ...support.slice(0, count - cardioCount)], pool, count)
}

function pickLeanToning(pool: Exercise[], count: number): Exercise[] {
  const cardio = pool.filter((e) => e.muscleGroup === 'cardio').slice(0, Math.min(2, count))
  const strength = pickAcrossMuscleGroups(
    pool.filter((e) => e.muscleGroup !== 'cardio'),
    count - cardio.length
  )
  return fillTo([...cardio, ...strength], pool, count)
}

function pickMuscleGain(pool: Exercise[], count: number): Exercise[] {
  const nonCardio = pool.filter((e) => e.muscleGroup !== 'cardio')
  const compounds = nonCardio.filter((e) => e.compound)
  const accessories = nonCardio.filter((e) => !e.compound)
  const compoundCount = Math.min(compounds.length, Math.ceil(count * 0.5))
  return fillTo([...compounds.slice(0, compoundCount), ...accessories], pool, count)
}

// Группы мышц, которые НЕ тренировались за последние windowHours часов —
// приоритет для силовой (правило 48–72ч отдыха для одной группы мышц)
function restedMuscleGroups(recentWorkouts: Workout[], exercises: Exercise[], windowHours: number): MuscleGroup[] {
  const idToGroup = new Map(exercises.map((e) => [e.id, e.muscleGroup] as const))
  const cutoff = Date.now() - windowHours * 3_600_000
  const trained = new Set<MuscleGroup>()
  for (const w of recentWorkouts) {
    if (new Date(w.date).getTime() < cutoff) continue
    for (const s of w.sets) {
      const group = idToGroup.get(s.exerciseId)
      if (group && group !== 'cardio') trained.add(group)
    }
  }
  const rested = STRENGTH_MUSCLE_GROUPS.filter((g) => !trained.has(g))
  return rested.length > 0 ? rested : DEFAULT_MUSCLE_GROUP_ROTATION
}

function pickStrength(pool: Exercise[], count: number, recentWorkouts: Workout[], exercises: Exercise[]): Exercise[] {
  const nonCardio = pool.filter((e) => e.muscleGroup !== 'cardio')
  const rested = new Set(restedMuscleGroups(recentWorkouts, exercises, 60))
  const preferred = nonCardio.filter((e) => rested.has(e.muscleGroup) && e.compound)
  const preferredIds = new Set(preferred.map((e) => e.id))
  const rest = nonCardio.filter((e) => !preferredIds.has(e.id))
  return fillTo([...preferred, ...rest], pool, count)
}

export interface WorkoutPlanParams {
  goal: WorkoutGoal
  location: WorkoutLocation
  durationMin: number
  experienceLevel: ExperienceLevel
  exercises: Exercise[]
  recentWorkouts: Workout[]
}

export interface WorkoutPlan {
  exerciseIds: string[]
  setsPerExercise: number
  repsMin: number
  repsMax: number
  restSeconds: number
  formatNote: string
}

export function generateWorkoutPlan(params: WorkoutPlanParams): WorkoutPlan {
  const { goal, location, durationMin, experienceLevel, exercises, recentWorkouts } = params
  const profile = GOAL_PROFILES[goal]
  const count = exerciseCountForDuration(durationMin)
  const pool = eligibleCatalog(exercises, location, experienceLevel)

  let selected: Exercise[]
  switch (goal) {
    case 'weight_loss':
      selected = pickWeightLoss(pool, count)
      break
    case 'lean_toning':
      selected = pickLeanToning(pool, count)
      break
    case 'muscle_gain':
      selected = pickMuscleGain(pool, count)
      break
    case 'strength':
      selected = pickStrength(pool, count, recentWorkouts, exercises)
      break
  }

  return {
    exerciseIds: selected.map((e) => e.id),
    setsPerExercise: profile.setsPerExercise,
    repsMin: profile.repsMin,
    repsMax: profile.repsMax,
    restSeconds: profile.restSeconds,
    formatNote: profile.formatNote,
  }
}

// Плавание — изолированная сущность, ни одно поле не пересекается с
// generateWorkoutPlan/обычным чек-листом упражнений и весом/повторами:
// стиль + сколько бассейнов им проплыли, длина бассейна — общая на сессию.
// По строке WorkoutSet на стиль (reps = число бассейнов, weightKg не
// используется), сводка человеком читаемым текстом — в notes.
export function buildSwimmingWorkout(
  date: string,
  durationMin: number,
  poolLengthM: number,
  styles: SwimStyleEntry[],
  exercises: Exercise[]
): NewWorkout | null {
  const swim = exercises.find((e) => e.name === SWIMMING_EXERCISE_NAME)
  const usedStyles = styles.filter((s) => s.lengths > 0)
  if (!swim || usedStyles.length === 0) return null

  const sets: NewWorkoutSet[] = usedStyles.map((s, i) => ({
    exerciseId: swim.id,
    setNumber: i + 1,
    reps: s.lengths,
    weightKg: 0,
  }))

  const summary = usedStyles
    .map((s) => `${SWIM_STYLE_LABELS[s.style]} — ${s.lengths} бассейн${s.lengths === 1 ? '' : 'ов'}`)
    .join('. ')

  return {
    date,
    title: SWIMMING_EXERCISE_NAME,
    durationMin,
    notes: `Бассейн ${poolLengthM} м. ${summary}.`,
    sets,
  }
}
