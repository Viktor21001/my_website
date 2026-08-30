import type { AgeGroup } from './fitness'
import type { BackgroundConfig, PanelLayoutPrefs } from './profile'

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
