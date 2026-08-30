import { Router } from 'express'
import { MuscleGroup, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const VALID_MUSCLE_GROUPS = Object.values(MuscleGroup)

const exerciseInclude = { createdBy: { select: { username: true } } } as const

// createdByUserId: null — системное (сид), иначе — автор из своей
// библиотеки. createdByUsername — не колонка БД, подставляется при чтении,
// чтобы вкладка «Сообщество» могла показать, кто добавил упражнение.
function serializeExercise(exercise: {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: string | null
  description: string | null
  homeFriendly: boolean
  compound: boolean
  minLevel: string
  bodyweightOnly: boolean
  isTimeBased: boolean
  createdByUserId: string | null
  createdBy: { username: string } | null
}) {
  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    description: exercise.description,
    homeFriendly: exercise.homeFriendly,
    compound: exercise.compound,
    minLevel: exercise.minLevel,
    bodyweightOnly: exercise.bodyweightOnly,
    isTimeBased: exercise.isTimeBased,
    createdByUserId: exercise.createdByUserId,
    createdByUsername: exercise.createdBy?.username ?? null,
  }
}

function readExerciseFields(body: unknown) {
  const { name, muscleGroup, equipment, homeFriendly, bodyweightOnly, isTimeBased } = (body ?? {}) as Record<string, unknown>
  return { name, muscleGroup, equipment, homeFriendly, bodyweightOnly, isTimeBased }
}

// Каталог общий для всех — чтение без авторизации. Один список на всё:
// конструктор тренировок (workoutGenerator.ts) и ручное добавление подходов
// используют вообще все строки, вне зависимости от автора — три вкладки
// библиотеки (Системная / Моя / Сообщество) фильтруют этот же список на
// клиенте по createdByUserId, отдельного эндпоинта под них не нужно.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' }, include: exerciseInclude })
    res.json(exercises.map(serializeExercise))
  })
)

// Добавление в общий каталог — становится записью в своей библиотеке автора
// (createdByUserId), сразу доступной всем в конструкторе тренировок и во
// вкладке «Сообщество». compound/minLevel — не в форме добавления,
// дефолтятся (false/beginner), они влияют только на эвристику
// автогенерации, а не на саму видимость/использование упражнения.
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, muscleGroup, equipment, homeFriendly, bodyweightOnly, isTimeBased } = readExerciseFields(req.body)

    if (typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 'Укажите название упражнения')
    }
    if (typeof muscleGroup !== 'string' || !VALID_MUSCLE_GROUPS.includes(muscleGroup as MuscleGroup)) {
      throw new HttpError(400, 'Некорректная группа мышц')
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        muscleGroup: muscleGroup as MuscleGroup,
        equipment: typeof equipment === 'string' && equipment.trim() ? equipment.trim() : null,
        homeFriendly: !!homeFriendly,
        bodyweightOnly: !!bodyweightOnly,
        isTimeBased: !!isTimeBased,
        createdByUserId: req.userId!,
      },
      include: exerciseInclude,
    })
    res.status(201).json(serializeExercise(exercise))
  })
)

// Редактирование — только автор своей же строки; системные (createdByUserId
// === null) и чужие правит нельзя. Все поля необязательные — меняем только
// то, что реально прислали.
router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const existing = await prisma.exercise.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new HttpError(404, 'Упражнение не найдено')
    if (existing.createdByUserId !== req.userId) {
      throw new HttpError(403, 'Можно редактировать только упражнения из своей библиотеки')
    }

    const { name, muscleGroup, equipment, homeFriendly, bodyweightOnly, isTimeBased } = readExerciseFields(req.body)

    const data: Prisma.ExerciseUpdateInput = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Укажите название упражнения')
      data.name = name.trim()
    }
    if (muscleGroup !== undefined) {
      if (typeof muscleGroup !== 'string' || !VALID_MUSCLE_GROUPS.includes(muscleGroup as MuscleGroup)) {
        throw new HttpError(400, 'Некорректная группа мышц')
      }
      data.muscleGroup = muscleGroup as MuscleGroup
    }
    if (equipment !== undefined) data.equipment = typeof equipment === 'string' && equipment.trim() ? equipment.trim() : null
    if (homeFriendly !== undefined) data.homeFriendly = !!homeFriendly
    if (bodyweightOnly !== undefined) data.bodyweightOnly = !!bodyweightOnly
    if (isTimeBased !== undefined) data.isTimeBased = !!isTimeBased

    const updated = await prisma.exercise.update({ where: { id: req.params.id }, data, include: exerciseInclude })
    res.json(serializeExercise(updated))
  })
)

// Удаление — только автор своей же строки. Если упражнение уже встречается
// в чьей-то тренировке (WorkoutSet.exerciseId без onDelete: Cascade),
// Prisma/Postgres откажет внешним ключом (P2003) — превращаем это в понятную
// ошибку, а не 500.
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const existing = await prisma.exercise.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new HttpError(404, 'Упражнение не найдено')
    if (existing.createdByUserId !== req.userId) {
      throw new HttpError(403, 'Можно удалять только упражнения из своей библиотеки')
    }

    try {
      await prisma.exercise.delete({ where: { id: req.params.id } })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new HttpError(409, 'Нельзя удалить — упражнение уже используется в чьей-то тренировке')
      }
      throw err
    }
    res.status(204).send()
  })
)

export default router
