export type UserStatus = 'online' | 'in-game' | 'coding' | 'offline'

export type BadgeId =
  | 'founder'      // 👑 создатель сайта — только у тебя
  | 'veteran_1y'   // 📅 GitHub аккаунт старше 1 года
  | 'veteran_3y'   // 🏆 GitHub аккаунт старше 3 лет
  | 'veteran_5y'   // 💎 GitHub аккаунт старше 5 лет
  | 'discipline'   // 🔥 коммиты 30 дней подряд в будние
  | 'gamer'        // 🎮 более 100 часов в Steam
  | 'hardcore'     // 🕹 более 1000 часов в Steam
  | 'opensource'   // 🚀 хотя бы одна звезда на репо
  | 'popular'      // ⭐ суммарно 10+ звёзд
  | 'polyglot'     // 🌐 5+ языков программирования
  | 'contributor'  // 🤝 есть публичные PR

export interface Badge {
  id: BadgeId
  label: string
  description: string
  icon: string
  unlockedAt?: Date
  /*
    progress — для бейджей с прогрессом (например "Дисциплина").
    Показываем сколько уже набрано из нужного количества.
    Необязательное поле — большинство бейджей просто есть или нет.
  */
  progress?: {
    current: number
    required: number
  }
}

export interface BackgroundConfig {
  type: 'image' | 'preset'
  url: string
  blur: number
  opacity: number
}

export interface SocialLinks {
  github?: string
  steam?: string
  wakatime?: string
  website?: string
}

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
  statusText?: string
  badges: Badge[]
  socialLinks: SocialLinks
  background: BackgroundConfig
  createdAt: Date
  lastSeen?: Date
}