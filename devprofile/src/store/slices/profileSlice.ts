import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User, BackgroundConfig } from '../../types/profile'

/*
  Моковые данные — временно.
  Когда напишем бэкенд — просто уберём MOCK_USER
  и добавим RTK Query эндпоинт который fetchит /api/profile.
  Структура User уже совпадает с тем что вернёт сервер.
*/
const MOCK_USER: User = {
  id: '1',
  username: 'yeliseyev',
  displayName: 'Yeliseyev',
  avatar: 'https://avatars.githubusercontent.com/u/583231?v=4',
  location: 'Yamal-Nenets, Russia',
  bio: 'Frontend Developer & Business Analyst. React, TypeScript, BPMN.',
  level: 18,
  xp: 1842,
  status: 'coding',
  statusText: 'Coding in VS Code',
  badges: [
    {
      id: 'founder',
      label: 'Основатель',
      description: 'Создатель DevProfile',
      icon: '👑',
      unlockedAt: new Date('2025-01-01'),
    },
    {
      id: 'veteran_1y',
      label: '1 год на GitHub',
      description: 'Аккаунт существует более года',
      icon: '📅',
    },
    {
      id: 'gamer',
      label: 'Геймер',
      description: 'Более 500 часов в Steam',
      icon: '🎮',
    },
  ],
  socialLinks: {
    github: 'yeliseyev',
  },
  background: {
    type: 'preset',
    url: '',
    blur: 0,
    opacity: 0.85,
  },
  createdAt: new Date('2024-01-01'),
}

interface ProfileState {
  user: User
  isLoading: boolean
  error: string | null
}

const initialState: ProfileState = {
  user: MOCK_USER,
  isLoading: false,
  error: null,
}

/*
  createSlice объединяет actions + reducer в одном месте.
  RTK автоматически создаёт action creators из reducers.
  Под капотом используется Immer — поэтому можно писать
  state.user = action.payload вместо { ...state, user: action.payload }
*/
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
    },
    setBackground(state, action: PayloadAction<BackgroundConfig>) {
      // Immer позволяет мутировать напрямую — не нужен spread
      state.user.background = action.payload
    },
    setStatus(
      state,
      action: PayloadAction<{ status: User['status']; statusText?: string }>
    ) {
      state.user.status = action.payload.status
      state.user.statusText = action.payload.statusText
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const { setUser, setBackground, setStatus, setLoading, setError } =
  profileSlice.actions

export default profileSlice.reducer