/*
  useFitnessData — единая точка входа для фитнес-данных с бэкенда.
  Тот же подход, что и useSteam/useGithub: компоненты не знают что
  под капотом RTK Query, получают {data, isLoading, isError} с
  дефолтами. skip: !token — без авторизации запросы не уходят.

  EMPTY_ARRAY — важно: раньше здесь было `data: x = []` прямо в
  деструктуризации. Это создаёт НОВЫЙ пустой массив на каждый рендер
  (даже когда сам data стабильно undefined), а такие массивы уходят
  в зависимости useEffect в useFitnessBadges/useFitnessRating —
  эффект видит "новый" массив каждый рендер, диспатчит, вызывает
  новый рендер и т.д. до "Maximum update depth exceeded". Один и тот
  же объект-константа вместо литерала решает проблему.
*/

import { useAppSelector } from './redux'
import {
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
} from '../store/api/backendApi'
import type { AgeGroup } from '../types/fitness'

const EMPTY_ARRAY: never[] = []

function useToken(): string | null {
  return useAppSelector((state) => state.auth.token)
}

export function useMeasurements() {
  const token = useToken()
  const { data, isLoading, isError } = useGetMeasurementsQuery(undefined, { skip: !token })
  return { measurements: data ?? EMPTY_ARRAY, isLoading, isError }
}

export function useInBodyResults() {
  const token = useToken()
  const { data, isLoading, isError } = useGetInBodyResultsQuery(undefined, { skip: !token })
  return { inbodyResults: data ?? EMPTY_ARRAY, isLoading, isError }
}

export function useWorkouts() {
  const token = useToken()
  const { data, isLoading, isError } = useGetWorkoutsQuery(undefined, { skip: !token })
  return { workouts: data ?? EMPTY_ARRAY, isLoading, isError }
}

export function useExercises() {
  const token = useToken()
  const { data, isLoading, isError } = useGetExercisesQuery(undefined, { skip: !token })
  return { exercises: data ?? EMPTY_ARRAY, isLoading, isError }
}

export function useLeaderboard(ageGroup: AgeGroup) {
  const token = useToken()
  const { data, isLoading, isError } = useGetLeaderboardQuery(ageGroup, { skip: !token })
  return { leaderboard: data ?? EMPTY_ARRAY, isLoading, isError }
}

// Реэкспорт мутаций — формам не нужно знать про backendApi напрямую
export {
  useAddMeasurementMutation,
  useAddInBodyResultMutation,
  useAddWorkoutMutation,
  useAddExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
}
