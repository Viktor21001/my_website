import type { AgeGroup } from './fitness'
import type { BackgroundConfig } from './profile'

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  avatar: string | null
  bio: string | null
  location: string | null
  ageGroup: AgeGroup
  createdAt: string
  githubUsername: string | null
  steamId: string | null
  favoriteSteamAppIds: number[]
  background: BackgroundConfig
}

// Любое подмножество полей профиля, которые можно поменять в Настройках
export interface UpdateProfilePayload {
  displayName?: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  githubUsername?: string | null
  steamId?: string | null
  favoriteSteamAppIds?: number[]
  background?: BackgroundConfig
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
