import type { AgeGroup } from './fitness'

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
