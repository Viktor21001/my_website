import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../index'
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../types/auth'
import type {
  AgeGroup,
  BodyMeasurement,
  Exercise,
  InBodyResult,
  LeaderboardEntry,
  NewBodyMeasurement,
  NewExercise,
  NewInBodyResult,
  NewWorkout,
  UpdateExercisePayload,
  Workout,
} from '../../types/fitness'
import type { SteamGameAchievementsCache } from '../../types/steam'

/*
  baseUrl — свой Express-сервер (папка Сервер\), а не внешний API,
  поэтому (в отличие от githubApi/steamApi) прокидываем токен
  через prepareHeaders вместо ключа в query-строке.
*/
export const backendApi = createApi({
  reducerPath: 'backendApi',

  baseQuery: fetchBaseQuery({
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://127.0.0.1:4000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),

  tagTypes: ['Measurements', 'InBody', 'Workouts', 'Exercises', 'Leaderboard', 'SteamAchievements'],

  endpoints: (builder) => ({

    register: builder.mutation<AuthResponse, RegisterPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: (raw: { user: AuthUser }) => raw.user,
    }),

    updateProfile: builder.mutation<AuthUser, UpdateProfilePayload>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
    }),

    changePassword: builder.mutation<{ ok: boolean }, ChangePasswordPayload>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    getMeasurements: builder.query<BodyMeasurement[], void>({
      query: () => '/measurements',
      providesTags: ['Measurements'],
    }),
    addMeasurement: builder.mutation<BodyMeasurement, NewBodyMeasurement>({
      query: (body) => ({ url: '/measurements', method: 'POST', body }),
      invalidatesTags: ['Measurements'],
    }),

    getInBodyResults: builder.query<InBodyResult[], void>({
      query: () => '/inbody',
      providesTags: ['InBody'],
    }),
    addInBodyResult: builder.mutation<InBodyResult, NewInBodyResult>({
      query: (body) => ({ url: '/inbody', method: 'POST', body }),
      invalidatesTags: ['InBody'],
    }),

    getWorkouts: builder.query<Workout[], void>({
      query: () => '/workouts',
      providesTags: ['Workouts'],
    }),
    addWorkout: builder.mutation<Workout, NewWorkout>({
      query: (body) => ({ url: '/workouts', method: 'POST', body }),
      invalidatesTags: ['Workouts'],
    }),

    getExercises: builder.query<Exercise[], void>({
      query: () => '/exercises',
      providesTags: ['Exercises'],
    }),
    addExercise: builder.mutation<Exercise, NewExercise>({
      query: (body) => ({ url: '/exercises', method: 'POST', body }),
      invalidatesTags: ['Exercises'],
    }),
    updateExercise: builder.mutation<Exercise, { id: string } & UpdateExercisePayload>({
      query: ({ id, ...body }) => ({ url: `/exercises/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Exercises'],
    }),
    deleteExercise: builder.mutation<void, string>({
      query: (id) => ({ url: `/exercises/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Exercises'],
    }),

    getLeaderboard: builder.query<LeaderboardEntry[], AgeGroup>({
      query: (ageGroup) => `/leaderboard?ageGroup=${ageGroup}`,
      providesTags: ['Leaderboard'],
    }),

    /*
      Кэш достижений по всей Steam-библиотеке — читает уже готовые данные
      из БД (см. Сервер/src/routes/steamAchievements.ts), никаких запросов
      к Steam при каждой загрузке страницы.

      startSteamAchievementsSync запускает синхронизацию в фоне на сервере
      и отвечает сразу же (total игр, статус running) — сама синхронизация
      может занимать десятки секунд-минуты на большую библиотеку, поэтому
      её прогресс читается отдельным поллингом getSteamAchievementsSyncStatus
      (см. useAchievementsLibrary в hooks/useSteam.ts), а не одним долгим
      запросом, который держал бы вкладку "подвисшей".
    */
    getSteamAchievementsCache: builder.query<
      { games: SteamGameAchievementsCache[]; lastSyncedAt: string | null },
      void
    >({
      query: () => '/steam-achievements',
      providesTags: ['SteamAchievements'],
    }),
    startSteamAchievementsSync: builder.mutation<{ status: string; total: number }, void>({
      query: () => ({ url: '/steam-achievements/sync', method: 'POST' }),
    }),
    getSteamAchievementsSyncStatus: builder.query<
      { status: 'idle' | 'running' | 'done' | 'error'; processed: number; total: number; gamesSynced: number; error?: string },
      void
    >({
      query: () => '/steam-achievements/sync/status',
    }),

  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetMeasurementsQuery,
  useAddMeasurementMutation,
  useGetInBodyResultsQuery,
  useAddInBodyResultMutation,
  useGetWorkoutsQuery,
  useAddWorkoutMutation,
  useGetExercisesQuery,
  useAddExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
  useGetLeaderboardQuery,
  useGetSteamAchievementsCacheQuery,
  useStartSteamAchievementsSyncMutation,
  useLazyGetSteamAchievementsSyncStatusQuery,
} = backendApi
