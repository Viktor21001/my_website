import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User, BackgroundConfig } from '../../types/profile'

/*
  Загружаем сохранённый фон из localStorage при старте.
  Почему именно здесь?
  initialState выполняется один раз при инициализации store.
  Если фон был сохранён раньше — восстанавливаем его сразу,
  без мигания дефолтного фона при загрузке страницы.
*/
function loadSavedBackground(): BackgroundConfig | null {
  try {
    const raw = localStorage.getItem('dp_background')
    return raw ? (JSON.parse(raw) as BackgroundConfig) : null
  } catch {
    // localStorage может быть недоступен (приватный режим браузера)
    return null
  }
}

const MOCK_USER: User = {
  id: '1',
  username: 'Viktor21001',
  displayName: 'Viktor21001',
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
  socialLinks: { github: 'Viktor21001' },
  // Берём сохранённый фон или дефолтный
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

      /*
        Сохраняем фон в localStorage сразу при изменении.
        Так фон переживёт перезагрузку страницы.
        Документация File API и localStorage:
        https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
      */
      try {
        localStorage.setItem('dp_background', JSON.stringify(action.payload))
      } catch {
        // Игнорируем — localStorage может быть переполнен
      }
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