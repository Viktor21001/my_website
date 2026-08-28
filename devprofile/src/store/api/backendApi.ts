import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../index'
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../../types/auth'
import type {
  AgeGroup,
  BodyMeasurement,
  Exercise,
  InBodyResult,
  LeaderboardEntry,
  NewBodyMeasurement,
  NewInBodyResult,
  NewWorkout,
  Workout,
} from '../../types/fitness'

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

  tagTypes: ['Measurements', 'InBody', 'Workouts', 'Exercises', 'Leaderboard'],

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

    getLeaderboard: builder.query<LeaderboardEntry[], AgeGroup>({
      query: (ageGroup) => `/leaderboard?ageGroup=${ageGroup}`,
      providesTags: ['Leaderboard'],
    }),

  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useGetMeasurementsQuery,
  useAddMeasurementMutation,
  useGetInBodyResultsQuery,
  useAddInBodyResultMutation,
  useGetWorkoutsQuery,
  useAddWorkoutMutation,
  useGetExercisesQuery,
  useGetLeaderboardQuery,
} = backendApi
