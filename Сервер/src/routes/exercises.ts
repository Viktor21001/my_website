import { Router } from 'express'
import { MuscleGroup } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const VALID_MUSCLE_GROUPS = Object.values(MuscleGroup)

// Каталог общий для всех — чтение без авторизации
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } })
    res.json(exercises)
  })
)

// Добавление в общий каталог — пользователь дополняет библиотеку своим
// упражнением, оно сразу доступно всем (та же модель, что у бота-каталога
// из сида). compound/minLevel — не в форме добавления, дефолтятся
// (false/beginner), они влияют только на эвристику автогенерации, а не на
// саму видимость/использование упражнения.
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, muscleGroup, equipment, homeFriendly, bodyweightOnly, isTimeBased } = req.body ?? {}

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
      },
    })
    res.status(201).json(exercise)
  })
)

export default router
