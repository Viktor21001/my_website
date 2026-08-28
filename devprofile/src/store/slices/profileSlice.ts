import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UserStatus, Badge } from '../../types/profile'

/*
  Раньше здесь лежал целый моковый User (имя/аватар/био/соцссылки/фон) —
  теперь это настоящие данные аккаунта из authSlice.user (Сервер\).
  Тут остаётся только то, что вычисляется на клиенте из GitHub/Steam
  и не принадлежит аккаунту как таковому: dev-бейджи, dev-уровень/XP,
  онлайн-статус. Тот же приём, что и в fitnessSlice — сырые данные
  переехали на бэкенд, здесь только производные величины.
*/
interface ProfileState {
  badges: Badge[]
  level: number
  xp: number
  status: UserStatus
  statusText?: string
  isLoading: boolean
  error: string | null
}

const initialState: ProfileState = {
  badges: [],
  level: 1,
  xp: 0,
  status: 'offline',
  statusText: undefined,
  isLoading: false,
  error: null,
}

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<{ status: UserStatus; statusText?: string }>) {
      state.status = action.payload.status
      state.statusText = action.payload.statusText
    },

    /*
      setBadges — обновляем список разблокированных бейджей.
      Вызывается из хука useBadges() после подсчёта.
      Заменяем весь массив — не мерджим, чтобы не было дублей.
    */
    setBadges(state, action: PayloadAction<Badge[]>) {
      state.badges = action.payload
    },

    /*
      setLevel — обновляем уровень и XP.
      XP = 10 за каждый разблокированный бейдж +
           1 за каждую звезду на репо +
           1 за каждые 10 часов в Steam.
      Уровень = XP / 100.
    */
    setLevel(state, action: PayloadAction<{ level: number; xp: number }>) {
      state.level = action.payload.level
      state.xp = action.payload.xp
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
  },
})

export const { setStatus, setBadges, setLevel, setLoading, setError } = profileSlice.actions
export default profileSlice.reducer
