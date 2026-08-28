/*
  useFitnessBadges — структурная копия hooks/useBadges.ts для фитнес-раздела.

  Отличие источника данных: вместо RTK Query кеша GitHub/Steam читаем
  RTK Query кеш backendApi (свой сервер) через хуки useFitnessData.ts —
  workouts/measurements/inbodyResults/leaderboard больше не моки,
  а реальные данные пользователя, но форма хука та же.

  Зависит от state.fitness.level (считается в useFitnessRating) только
  ради бейджа level_10 — при первом маунте level ещё не посчитан, эффект
  просто пересчитает бейджи ещё раз, когда useFitnessRating обновит level.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { setBadges } from '../store/slices/fitnessSlice'
import { makeFitnessBadge } from '../config/fitnessBadges'
import { longestDailyStreak, sortByDateAsc } from '../utils/fitnessCalc'
import { useMeasurements, useWorkouts, useInBodyResults, useLeaderboard } from './useFitnessData'
import type { FitnessBadge } from '../types/fitness'

export function useFitnessBadges() {
  const dispatch = useAppDispatch()

  const ageGroup = useAppSelector((state) => state.auth.user?.ageGroup ?? '25-30')
  const { workouts } = useWorkouts()
  const { measurements } = useMeasurements()
  const { inbodyResults } = useInBodyResults()
  const { leaderboard } = useLeaderboard(ageGroup)
  const level = useAppSelector((state) => state.fitness.level)

  useEffect(() => {
    const unlocked: FitnessBadge[] = []

    if (workouts.length >= 1) unlocked.push(makeFitnessBadge('first_workout'))

    // ── Стрик активности ─────────────────────────────────────────
    const streakDays = longestDailyStreak(workouts.map((w) => w.date))
    if (streakDays >= 7) unlocked.push(makeFitnessBadge('streak_7'))
    if (streakDays >= 30) unlocked.push(makeFitnessBadge('streak_30'))

    // ── Замеры и InBody ───────────────────────────────────────────
    if (measurements.length >= 5) unlocked.push(makeFitnessBadge('measurements_5'))
    if (inbodyResults.length >= 1) unlocked.push(makeFitnessBadge('inbody_first'))

    if (inbodyResults.length >= 2) {
      const sorted = sortByDateAsc(inbodyResults)
      const first = sorted[0]
      const latest = sorted[sorted.length - 1]

      const fatLossDelta = first.bodyFatPercent - latest.bodyFatPercent
      if (fatLossDelta >= 5) unlocked.push(makeFitnessBadge('fat_loss_5pct'))

      const muscleGainDelta = latest.muscleMassKg - first.muscleMassKg
      if (muscleGainDelta >= 2) unlocked.push(makeFitnessBadge('muscle_gain_2kg'))
    }

    // ── Объём тренировок ──────────────────────────────────────────
    if (workouts.length >= 50) unlocked.push(makeFitnessBadge('workouts_50'))
    if (workouts.length >= 100) unlocked.push(makeFitnessBadge('workouts_100'))

    // ── Рейтинг ───────────────────────────────────────────────────
    const selfEntry = leaderboard.find((e) => e.isCurrentUser)
    if (selfEntry && selfEntry.rank <= 3) unlocked.push(makeFitnessBadge('top3_leaderboard'))

    // ── Уровень ───────────────────────────────────────────────────
    if (level >= 10) unlocked.push(makeFitnessBadge('level_10'))

    dispatch(setBadges(unlocked))
  }, [workouts, measurements, inbodyResults, leaderboard, level, dispatch])
}
