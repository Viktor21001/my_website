import type { ActiveSection } from '../store/slices/uiSlice'

export type UserStatus = 'online' | 'in-game' | 'coding' | 'offline'

// Порядок id панелей внутри одной колонки одной вкладки — настраивается
// перетаскиванием за ручку в шапке панели (см. PanelBoard)
export interface PanelColumnLayout {
  left: string[]
  right: string[]
}

// По вкладке — необязательно, вкладку в которой пользователь ничего не
// перетаскивал просто нет как ключа, тогда клиент берёт порядок по
// умолчанию из PANEL_REGISTRY (см. config/panelRegistry.tsx)
export type PanelLayoutPrefs = Partial<Record<ActiveSection, PanelColumnLayout>>

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

/*
  Фолбэк для авторизованных сессий из localStorage, сохранённых ДО того
  как background/githubUsername/steamId появились в AuthUser — без него
  чтение user.background у такого «старого» юзера даёт undefined и роняет
  всё дерево (например BackgroundSection в SettingsPanel).
*/
export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'preset',
  url: '',
  blur: 0,
  opacity: 0.85,
}

