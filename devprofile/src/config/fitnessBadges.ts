/*
  fitnessBadges.ts — справочник фитнес-достижений.
  Прямое зеркало config/badges.ts: внешний вид здесь,
  условие разблокировки — комментарием, логика — в useFitnessBadges.
*/

import type { FitnessBadgeId, FitnessBadge } from '../types/fitness'

export const FITNESS_BADGE_CONFIG: Record<FitnessBadgeId, Omit<FitnessBadge, 'id' | 'unlockedAt'>> = {
  first_workout: {
    label: 'Первый шаг',
    description: 'Записана первая тренировка',
    icon: '🏁',
    // Условие: workouts.length >= 1
  },

  streak_7: {
    label: 'Неделя подряд',
    description: '7 дней подряд с тренировкой',
    icon: '🔥',
    // Условие: максимальная цепочка дней с тренировками >= 7
  },

  streak_30: {
    label: 'Месяц дисциплины',
    description: '30 дней подряд с тренировкой',
    icon: '🌟',
    // Условие: максимальная цепочка дней с тренировками >= 30
  },

  measurements_5: {
    label: 'Под контролем',
    description: '5 и более замеров тела',
    icon: '📏',
    // Условие: measurements.length >= 5
  },

  inbody_first: {
    label: 'Диагностика',
    description: 'Первый скан InBody загружен',
    icon: '🔬',
    // Условие: inbodyResults.length >= 1
  },

  fat_loss_5pct: {
    label: 'Минус жир',
    description: 'Снижение % жира на 5 и более от первого скана',
    icon: '📉',
    // Условие: первый.bodyFatPercent - последний.bodyFatPercent >= 5
  },

  muscle_gain_2kg: {
    label: 'Набор массы',
    description: 'Прирост мышечной массы на 2кг и более',
    icon: '💪',
    // Условие: последний.muscleMassKg - первый.muscleMassKg >= 2
  },

  workouts_50: {
    label: 'Полтинник',
    description: '50 тренировок записано',
    icon: '🎯',
    // Условие: workouts.length >= 50
  },

  workouts_100: {
    label: 'Сотка',
    description: '100 тренировок записано',
    icon: '🏆',
    // Условие: workouts.length >= 100
  },

  top3_leaderboard: {
    label: 'Пьедестал',
    description: 'Топ-3 в своей возрастной группе',
    icon: '🥉',
    // Условие: rank <= 3 в своей ageGroup
  },

  level_10: {
    label: 'Десятый уровень',
    description: 'Фитнес-профиль достиг 10 уровня',
    icon: '⚡',
    // Условие: fitness.level >= 10
  },
}

export function makeFitnessBadge(
  id: FitnessBadgeId,
  progress?: FitnessBadge['progress']
): FitnessBadge {
  return {
    id,
    ...FITNESS_BADGE_CONFIG[id],
    unlockedAt: new Date(),
    progress,
  }
}
