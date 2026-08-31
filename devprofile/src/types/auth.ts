import type { AgeGroup } from './fitness'
import type { BackgroundConfig, PanelLayoutPrefs } from './profile'

export type Role = 'USER' | 'ADMIN' | 'CREATOR'

// Кто может написать первым, если ещё не в друзьях (друзей не ограничивает —
// им можно писать всегда). Сервер перепроверяет это на каждой отправке,
// см. Сервер/src/lib/messaging.ts
export type MessagingPrivacy = 'EVERYONE' | 'FRIENDS_ONLY' | 'NOBODY'

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  avatar: string | null
  bio: string | null
  location: string | null
  timezone: string | null
  exerciseLibraryName: string | null
  // Сам ключ сервер не отдаёт (см. Сервер/src/lib/serializeUser.ts) —
  // только флаг, настроен ли он, чтобы включить блок «Достижения»
  hasSteamApiKey: boolean
  ageGroup: AgeGroup
  createdAt: string
  githubUsername: string | null
  steamId: string | null
  favoriteSteamAppIds: number[]
  background: BackgroundConfig
  panelLayout: PanelLayoutPrefs | null
  // Вкладка, открываемая по умолчанию при входе — null у аккаунтов,
  // которые никогда это не настраивали (тогда клиент берёт Dev)
  defaultSection: string | null
  // Только для показа кнопки «Админ-панель» — сам доступ к admin-эндпоинтам
  // сервер перепроверяет заново на каждый запрос, этому полю не доверяет
  role: Role
  messagingPrivacy: MessagingPrivacy
}

// Любое подмножество полей профиля, которые можно поменять в Настройках
export interface UpdateProfilePayload {
  displayName?: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  timezone?: string | null
  exerciseLibraryName?: string | null
  githubUsername?: string | null
  steamId?: string | null
  // '' — явная очистка сохранённого ключа, см. PATCH /users/me
  steamApiKey?: string
  favoriteSteamAppIds?: number[]
  background?: BackgroundConfig
  panelLayout?: PanelLayoutPrefs
  defaultSection?: string
  messagingPrivacy?: MessagingPrivacy
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
  displayName: string
  ageGroup: AgeGroup
}

export interface LoginPayload {
  emailOrUsername: string
  password: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}
