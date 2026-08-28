import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

const workoutInclude = { sets: { include: { exercise: true } } } as const

// exerciseName в клиентском типе WorkoutSet — не колонка БД, подставляем при чтении
function serializeWorkout(workout: {
  id: string
  date: Date
  title: string
  durationMin: number
  notes: string | null
  sets: {
    exerciseId: string
    setNumber: number
    reps: number
    weightKg: number
    exercise: { name: string }
  }[]
}) {
  return {
    id: workout.id,
    date: workout.date,
    title: workout.title,
    durationMin: workout.durationMin,
    notes: workout.notes,
    sets: workout.sets.map((s) => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exercise.name,
      setNumber: s.setNumber,
      reps: s.reps,
      weightKg: s.weightKg,
    })),
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.userId! },
      orderBy: { date: 'desc' },
      include: workoutInclude,
    })
    res.json(workouts.map(serializeWorkout))
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, title, durationMin, notes, sets } = req.body ?? {}

    if (!date || !title || typeof durationMin !== 'number' || !Array.isArray(sets) || sets.length === 0) {
      throw new HttpError(400, 'Тренировка должна содержать дату, название, длительность и хотя бы один подход')
    }
    for (const s of sets) {
      if (
        !s ||
        typeof s.exerciseId !== 'string' ||
        typeof s.setNumber !== 'number' ||
        typeof s.reps !== 'number' ||
        typeof s.weightKg !== 'number'
      ) {
        throw new HttpError(400, 'Некорректные данные подхода')
      }
    }

    // Вложенный create — Prisma сама оборачивает это в одну транзакцию
    const workout = await prisma.workout.create({
      data: {
        userId: req.userId!,
        date: new Date(date),
        title,
        durationMin,
        notes: notes || null,
        sets: {
          create: sets.map((s: { exerciseId: string; setNumber: number; reps: number; weightKg: number }) => ({
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            reps: s.reps,
            weightKg: s.weightKg,
          })),
        },
      },
      include: workoutInclude,
    })

    res.status(201).json(serializeWorkout(workout))
  })
)

export default router
