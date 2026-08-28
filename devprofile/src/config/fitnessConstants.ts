import type { AgeGroup } from '../types/fitness'

export const AGE_GROUPS: AgeGroup[] = ['16-20', '20-25', '25-30', '30-35', '35-40', '40+']

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '16-20': '16–20',
  '20-25': '20–25',
  '25-30': '25–30',
  '30-35': '30–35',
  '35-40': '35–40',
  '40+':   '40+',
}

/*
  Веса совокупного рейтинга — сумма activityScore/bodyProgressScore/
  achievementScore, взвешенная этими коэффициентами, даёт totalScore,
  который конвертируется в XP фитнес-профиля (см. useFitnessRating).
  XP_PER_LEVEL/levelFromXp берём из config/constants.ts — не дублируем.
*/
export const ACTIVITY_WEIGHT = 1
export const BODY_PROGRESS_WEIGHT = 1
export const ACHIEVEMENT_WEIGHT = 1
