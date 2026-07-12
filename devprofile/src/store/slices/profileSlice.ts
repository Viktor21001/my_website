import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User, BackgroundConfig, Badge } from '../../types/profile'

function loadSavedBackground(): BackgroundConfig | null {
  try {
    const raw = localStorage.getItem('dp_background')
    return raw ? (JSON.parse(raw) as BackgroundConfig) : null
  } catch {
    return null
  }
}

const MOCK_USER: User = {
  id: '1',
  username: 'yeliseyev',
  displayName: 'Yeliseyev',
  avatar: 'https://avatars.githubusercontent.com/u/583231?v=4',
  location: 'Yamal-Nenets, Russia',
  bio: 'Frontend Developer & Business Analyst. React, TypeScript, BPMN.',
  level: 1,        // теперь вычисляется динамически в Фазе 5
  xp: 0,           // теперь вычисляется динамически в Фазе 5
  status: 'online',
  statusText: undefined,
  badges: [],      // теперь вычисляются динамически
  socialLinks: {
    github: import.meta.env.VITE_GITHUB_USERNAME ?? 'yeliseyev',
    steam: import.meta.env.VITE_STEAM_ID,
  },
  background: loadSavedBackground() ?? {
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

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
    },

    setBackground(state, action: PayloadAction<BackgroundConfig>) {
      state.user.background = action.payload
      try {
        localStorage.setItem('dp_background', JSON.stringify(action.payload))
      } catch {}
    },

    setStatus(
      state,
      action: PayloadAction<{ status: User['status']; statusText?: string }>
    ) {
      state.user.status = action.payload.status
      state.user.statusText = action.payload.statusText
    },

    /*
      setBadges — обновляем список разблокированных бейджей.
      Вызывается из хука useBadges() после подсчёта.
      Заменяем весь массив — не мерджим, чтобы не было дублей.
    */
    setBadges(state, action: PayloadAction<Badge[]>) {
      state.user.badges = action.payload
    },

    /*
      setLevel — обновляем уровень и XP.
      XP = 10 за каждый разблокированный бейдж +
           1 за каждую звезду на репо +
           1 за каждые 10 часов в Steam.
      Уровень = XP / 100.
    */
    setLevel(state, action: PayloadAction<{ level: number; xp: number }>) {
      state.user.level = action.payload.level
      state.user.xp    = action.payload.xp
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const {
  setUser,
  setBackground,
  setStatus,
  setBadges,
  setLevel,
  setLoading,
  setError,
} = profileSlice.actions

export default profileSlice.reducer