/*
  fitness.ts — типы данных фитнес-раздела.

  Даты храним как ISO-строки (а не Date), id есть у каждой сущности —
  чтобы моковые массивы позже можно было заменить ответами реального API
  без переписывания типов.
*/

export type AgeGroup = '16-20' | '21-25' | '26-30' | '31-35' | '36-40' | '41+'

export interface BodyMeasurement {
  id: string
  date: string // ISO
  weightKg: number
  chestCm: number
  waistCm: number
  hipsCm: number
  bicepCm: number
  thighCm: number
  notes?: string
}

export interface InBodyResult {
  id: string
  date: string // ISO
  weightKg: number
  bodyFatPercent: number
  skeletalMuscleMassKg: number
  muscleMassKg: number
  bodyWaterPercent: number
  bmi: number
  visceralFatLevel: number
  basalMetabolicRateKcal: number
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'

// Названо experienceLevel/ExperienceLevel, а не level — level уже занят
// геймификационным XP-уровнем фитнес-профиля (см. fitnessSlice.ts)
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: string
  description?: string
  homeFriendly: boolean
  compound: boolean
  minLevel: ExperienceLevel
  // bodyweightOnly — вес не вводится руками, в подходе фигурирует вес тела
  // isTimeBased    — WorkoutSet.reps хранит минуты, а не количество повторов
  bodyweightOnly: boolean
  isTimeBased: boolean
}

// Пользователь дополняет общую библиотеку — compound/minLevel не задаются
// руками, дефолтятся на сервере (влияют только на эвристику автогенерации)
export interface NewExercise {
  name: string
  muscleGroup: MuscleGroup
  equipment?: string
  homeFriendly: boolean
  bodyweightOnly: boolean
  isTimeBased: boolean
}

// Конструктор тренировок (WorkoutBuilder) — цель и место тренировки
export type WorkoutGoal = 'weight_loss' | 'lean_toning' | 'muscle_gain' | 'strength'
export type WorkoutLocation = 'home' | 'gym'

// Плавание — изолированная запись: стиль + количество проплытых бассейнов
export type SwimStyle = 'crawl' | 'breaststroke' | 'backstroke' | 'butterfly'
export interface SwimStyleEntry {
  style: SwimStyle
  lengths: number
}

export interface WorkoutSet {
  exerciseId: string
  exerciseName: string
  setNumber: number
  reps: number
  weightKg: number
}

export interface Workout {
  id: string
  date: string // ISO — дата, за которую засчитана тренировка (выбирается вручную)
  createdAt: string // ISO — момент сохранения записи, тай-брейк для сортировки истории
  title: string
  durationMin: number
  sets: WorkoutSet[]
  notes?: string
}

// Зеркало BadgeId/Badge из types/profile.ts — та же форма, отдельный набор id
export type FitnessBadgeId =
  | 'first_workout'   // 🏁 первая тренировка
  | 'streak_7'         // 🔥 7 дней подряд активности
  | 'streak_30'        // 🌟 30 дней подряд активности
  | 'measurements_5'   // 📏 5 замеров тела
  | 'inbody_first'     // 🔬 первый скан InBody
  | 'fat_loss_5pct'    // 📉 -5% жира от первого замера
  | 'muscle_gain_2kg'  // 💪 +2кг мышечной массы
  | 'workouts_50'      // 🎯 50 тренировок
  | 'workouts_100'     // 🏆 100 тренировок
  | 'top3_leaderboard' // 🥉 топ-3 в своей возрастной группе
  | 'level_10'         // ⚡ 10 уровень фитнес-профиля

export interface FitnessBadge {
  id: FitnessBadgeId
  label: string
  description: string
  icon: string
  unlockedAt?: Date
  progress?: {
    current: number
    required: number
  }
}

// Тела запросов на создание — то же самое, но без id (его назначает сервер)
export type NewBodyMeasurement = Omit<BodyMeasurement, 'id'>
export type NewInBodyResult = Omit<InBodyResult, 'id'>
export interface NewWorkoutSet {
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
}
export interface NewWorkout {
  date: string
  title: string
  durationMin: number
  notes?: string
  sets: NewWorkoutSet[]
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar: string
  ageGroup: AgeGroup
  activityScore: number
  bodyProgressScore: number
  achievementScore: number
  totalScore: number
  level: number
  isCurrentUser?: boolean
}
