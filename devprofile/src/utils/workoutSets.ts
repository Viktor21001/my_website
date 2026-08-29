// setNumber — порядковый номер подхода для КАЖДОГО упражнения отдельно,
// считается по порядку строк формы (общий хелпер для AddWorkoutForm и WorkoutBuilder)

import type { NewWorkoutSet } from '../types/fitness'

export interface SetRowInput {
  exerciseId: string
  reps: string
  weightKg: string
}

export function assignSetNumbers(rows: SetRowInput[]): NewWorkoutSet[] {
  const perExerciseCount: Record<string, number> = {}
  return rows.map((r) => {
    perExerciseCount[r.exerciseId] = (perExerciseCount[r.exerciseId] ?? 0) + 1
    return {
      exerciseId: r.exerciseId,
      setNumber: perExerciseCount[r.exerciseId],
      reps: Number(r.reps),
      weightKg: Number(r.weightKg),
    }
  })
}
