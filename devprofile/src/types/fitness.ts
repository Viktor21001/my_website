/*
  fitness.ts — типы данных фитнес-раздела.

  Даты храним как ISO-строки (а не Date), id есть у каждой сущности —
  чтобы моковые массивы позже можно было заменить ответами реального API
  без переписывания типов.
*/

export type AgeGroup = '16-20' | '20-25' | '25-30' | '30-35' | '35-40' | '40+'

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

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: string
  description?: string
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
  date: string // ISO
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
