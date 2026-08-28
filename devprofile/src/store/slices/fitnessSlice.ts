import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  BodyMeasurement,
  InBodyResult,
  Exercise,
  Workout,
  FitnessBadge,
  LeaderboardEntry,
} from '../../types/fitness'
import {
  MOCK_MEASUREMENTS,
  MOCK_INBODY_RESULTS,
  MOCK_EXERCISES,
  MOCK_WORKOUTS,
  MOCK_LEADERBOARD,
} from '../../mocks/fitnessMockData'

interface FitnessState {
  measurements: BodyMeasurement[]
  inbodyResults: InBodyResult[]
  exercises: Exercise[]
  workouts: Workout[]
  badges: FitnessBadge[]
  level: number
  xp: number
  leaderboard: LeaderboardEntry[]
  isLoading: boolean
  error: string | null
}

const initialState: FitnessState = {
  measurements: MOCK_MEASUREMENTS,
  inbodyResults: MOCK_INBODY_RESULTS,
  exercises: MOCK_EXERCISES,
  workouts: MOCK_WORKOUTS,
  badges: [],   // вычисляются в useFitnessBadges
  level: 1,     // вычисляется в useFitnessRating
  xp: 0,
  leaderboard: MOCK_LEADERBOARD,
  isLoading: false,
  error: null,
}

const fitnessSlice = createSlice({
  name: 'fitness',
  initialState,
  reducers: {
    setMeasurements(state, action: PayloadAction<BodyMeasurement[]>) {
      state.measurements = action.payload
    },
    setInBodyResults(state, action: PayloadAction<InBodyResult[]>) {
      state.inbodyResults = action.payload
    },
    setWorkouts(state, action: PayloadAction<Workout[]>) {
      state.workouts = action.payload
    },

    /*
      setBadges — заменяем весь массив разблокированных бейджей.
      Вызывается из useFitnessBadges() после подсчёта.
    */
    setBadges(state, action: PayloadAction<FitnessBadge[]>) {
      state.badges = action.payload
    },

    /*
      setLevel — уровень/XP фитнес-профиля.
      Считается в useFitnessRating() из трёх метрик рейтинга
      (активность, прогресс тела, очки достижений).
    */
    setLevel(state, action: PayloadAction<{ level: number; xp: number }>) {
      state.level = action.payload.level
      state.xp = action.payload.xp
    },

    setLeaderboard(state, action: PayloadAction<LeaderboardEntry[]>) {
      state.leaderboard = action.payload
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
  setMeasurements,
  setInBodyResults,
  setWorkouts,
  setBadges,
  setLevel,
  setLeaderboard,
  setLoading,
  setError,
} = fitnessSlice.actions

export default fitnessSlice.reducer
