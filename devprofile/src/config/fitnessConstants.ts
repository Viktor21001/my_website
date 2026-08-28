import type { AgeGroup } from '../types/fitness'

// Границы не пересекаются — каждый возраст попадает ровно в одну группу
export const AGE_GROUPS: AgeGroup[] = ['16-20', '21-25', '26-30', '31-35', '36-40', '41+']

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '16-20': '16–20',
  '21-25': '21–25',
  '26-30': '26–30',
  '31-35': '31–35',
  '36-40': '36–40',
  '41+':   '41+',
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
