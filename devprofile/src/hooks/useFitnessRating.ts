/*
  useFitnessRating — совокупный рейтинг фитнес-профиля.

  Три метрики (как договорено с пользователем):
  - activityScore     — объём тренировок + стрик подряд идущих дней
  - bodyProgressScore — динамика замеров и InBody (талия/жир/мышцы)
  - achievementScore  — количество разблокированных бейджей

  totalScore = сумма трёх метрик (веса — config/fitnessConstants.ts).
  XP = totalScore * XP_MULTIPLIER, уровень — через levelFromXp
  из config/constants.ts (тот же примитив, что и у dev-уровня,
  но отдельный XP-пул — см. обоснование в плане/App.tsx).

  Запускается после useFitnessBadges (порядок хуков в App.tsx) —
  achievementScore зависит от уже посчитанных бейджей.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { setLevel } from '../store/slices/fitnessSlice'
import { levelFromXp } from '../config/constants'
import { ACTIVITY_WEIGHT, BODY_PROGRESS_WEIGHT, ACHIEVEMENT_WEIGHT } from '../config/fitnessConstants'
import { longestDailyStreak, sortByDateAsc } from '../utils/fitnessCalc'
import { useMeasurements, useWorkouts, useInBodyResults } from './useFitnessData'

// Множитель перевода очков рейтинга в XP — подобран так, чтобы уровень
// заметно рос на реалистичном объёме данных
const XP_MULTIPLIER = 5

export function useFitnessRating() {
  const dispatch = useAppDispatch()

  const { workouts } = useWorkouts()
  const { measurements } = useMeasurements()
  const { inbodyResults } = useInBodyResults()
  const badges = useAppSelector((state) => state.fitness.badges)

  useEffect(() => {
    // ── Активность ────────────────────────────────────────────────
    const streakDays = longestDailyStreak(workouts.map((w) => w.date))
    const activityScore = Math.min(100, workouts.length * 4 + streakDays * 3)

    // ── Прогресс тела ────────────────────────────────────────────
    let bodyProgressScore = 0
    if (measurements.length >= 2) {
      const sorted = sortByDateAsc(measurements)
      const first = sorted[0]
      const latest = sorted[sorted.length - 1]
      const waistDelta = first.waistCm - latest.waistCm // похудение талии = прогресс
      bodyProgressScore += Math.max(0, waistDelta) * 3
    }
    if (inbodyResults.length >= 2) {
      const sorted = sortByDateAsc(inbodyResults)
      const first = sorted[0]
      const latest = sorted[sorted.length - 1]
      const fatLossDelta = first.bodyFatPercent - latest.bodyFatPercent
      const muscleGainDelta = latest.muscleMassKg - first.muscleMassKg
      bodyProgressScore += Math.max(0, fatLossDelta) * 4 + Math.max(0, muscleGainDelta) * 8
    }
    bodyProgressScore = Math.min(100, Math.round(bodyProgressScore))

    // ── Достижения ────────────────────────────────────────────────
    const achievementScore = Math.min(100, badges.length * 10)

    // ── Итог ──────────────────────────────────────────────────────
    const totalScore = Math.round(
      activityScore * ACTIVITY_WEIGHT +
      bodyProgressScore * BODY_PROGRESS_WEIGHT +
      achievementScore * ACHIEVEMENT_WEIGHT
    )

    const xp = totalScore * XP_MULTIPLIER
    const level = Math.max(1, levelFromXp(xp))

    dispatch(setLevel({ level, xp }))
  }, [workouts, measurements, inbodyResults, badges, dispatch])
}
