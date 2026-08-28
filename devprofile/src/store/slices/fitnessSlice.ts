import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { FitnessBadge } from '../../types/fitness'

/*
  Сырые данные (измерения/InBody/тренировки/упражнения/лидерборд) больше
  не хранятся здесь — они приходят напрямую из RTK Query кеша backendApi
  (см. hooks/useFitnessData.ts). В этом слайсе остаётся только то, что
  вычисляется на клиенте из этих данных: бейджи и уровень/XP.
*/
interface FitnessState {
  badges: FitnessBadge[]
  level: number
  xp: number
  isLoading: boolean
  error: string | null
}

const initialState: FitnessState = {
  badges: [],   // вычисляются в useFitnessBadges
  level: 1,     // вычисляется в useFitnessRating
  xp: 0,
  isLoading: false,
  error: null,
}

const fitnessSlice = createSlice({
  name: 'fitness',
  initialState,
  reducers: {
    /*
      setBadges — заменяем весь массив разблокированных бейджей.
      Вызывается из useFitnessBadges() после подсчёта.
    */
    setBadges(state, action: PayloadAction<FitnessBadge[]>) {
      state.badges = action.payload
    },

    /*
      setLevel — уровень и XP фитнес-профиля.
      Считается в useFitnessRating() из трёх метрик рейтинга
      (активность, прогресс тела, очки достижений).
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

export const { setBadges, setLevel, setLoading, setError } = fitnessSlice.actions
export default fitnessSlice.reducer
