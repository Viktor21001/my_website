/*
  Типы описываем ДО компонентов по двум причинам:
  1. Компоненты будут получать эти типы через props
  2. Когда подключим бэкенд — типы уже совпадут с моделью БД
     и ничего переписывать не придётся
*/

export type UserStatus = 'online' | 'in-game' | 'coding' | 'offline'

export type BadgeId =
  | 'founder'     // 👑 создатель сайта
  | 'veteran_1y'  // 1 год на GitHub
  | 'veteran_3y'  // 3 года на GitHub
  | 'discipline'  // 30 коммитов подряд в будние
  | 'gamer'       // много часов в Steam
  | 'opensource'  // есть звёзды на репо
  | 'polyglot'    // 5+ языков программирования

export interface Badge {
  id: BadgeId
  label: string
  description: string
  icon: string
  unlockedAt?: Date
}

export interface BackgroundConfig {
  type: 'image' | 'preset'
  url: string
  blur: number    // 0–20
  opacity: number // 0–1
}

export interface SocialLinks {
  github?: string   // username
  steam?: string    // steamId
  wakatime?: string // username
  website?: string  // полный URL
}

// Главная модель — описана под будущую таблицу users в БД
export interface User {
  id: string
  username: string
  displayName: string
  avatar: string
  location?: string
  bio?: string
  level: number
  xp: number
  status: UserStatus
  statusText?: string     // "Playing Subnautica 2" / "Coding in VS Code"
  badges: Badge[]
  socialLinks: SocialLinks
  background: BackgroundConfig
  createdAt: Date
  lastSeen?: Date
}