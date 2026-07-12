/*
  badges.ts — справочник всех возможных бейджей.
  
  Здесь описаны:
  - Внешний вид (иконка, название, описание)
  - Условие разблокировки (в виде комментария)
  
  Сама логика проверки условий — в хуке useBadges.
  Разделяем данные и логику — проще добавлять новые бейджи.
*/

import type { BadgeId, Badge } from '../types/profile'

// Полное описание каждого бейджа без unlockedAt —
// дату разблокировки добавляем динамически в useBadges
export const BADGE_CONFIG: Record<BadgeId, Omit<Badge, 'id' | 'unlockedAt'>> = {
  founder: {
    label: 'Основатель',
    description: 'Создатель DevProfile',
    icon: '👑',
    // Условие: захардкожен — только у создателя сайта
  },

  veteran_1y: {
    label: 'Ветеран',
    description: 'GitHub аккаунт старше 1 года',
    icon: '📅',
    // Условие: Date.now() - githubProfile.createdAt > 365 дней
  },

  veteran_3y: {
    label: 'Старожил',
    description: 'GitHub аккаунт старше 3 лет',
    icon: '🏆',
    // Условие: Date.now() - githubProfile.createdAt > 3 * 365 дней
  },

  veteran_5y: {
    label: 'Легенда',
    description: 'GitHub аккаунт старше 5 лет',
    icon: '💎',
    // Условие: Date.now() - githubProfile.createdAt > 5 * 365 дней
  },

  discipline: {
    label: 'Дисциплина',
    description: '30 дней подряд коммиты в будние дни',
    icon: '🔥',
    // Условие: анализируем events — 30 уникальных будних дней подряд с PushEvent
  },

  gamer: {
    label: 'Геймер',
    description: 'Более 100 часов в Steam',
    icon: '🎮',
    // Условие: суммарный playtimeForever по всем играм > 6000 минут
  },

  hardcore: {
    label: 'Хардкор',
    description: 'Более 1000 часов в Steam',
    icon: '🕹',
    // Условие: суммарный playtimeForever > 60000 минут
  },

  opensource: {
    label: 'Опенсорс',
    description: 'Хотя бы одна звезда на репозитории',
    icon: '🚀',
    // Условие: хотя бы один репо с stars > 0
  },

  popular: {
    label: 'Популярный',
    description: '10 и более звёзд суммарно',
    icon: '⭐',
    // Условие: сумма stars по всем репо >= 10
  },

  polyglot: {
    label: 'Полиглот',
    description: '5 и более языков программирования',
    icon: '🌐',
    // Условие: уникальных языков в репозиториях >= 5
  },

  contributor: {
    label: 'Контрибьютор',
    description: 'Есть публичные Pull Request',
    icon: '🤝',
    // Условие: в events есть хотя бы один PullRequestEvent
  },
}

// Утилита — собирает объект Badge из конфига + id + дата
export function makeBadge(
  id: BadgeId,
  progress?: Badge['progress']
): Badge {
  return {
    id,
    ...BADGE_CONFIG[id],
    unlockedAt: new Date(),
    progress,
  }
}