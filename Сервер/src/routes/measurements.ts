import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId: req.userId! },
      orderBy: { date: 'desc' },
    })
    res.json(measurements)
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, weightKg, chestCm, waistCm, hipsCm, bicepCm, thighCm, bodyFatPercent, skeletalMuscleMassKg, notes } = req.body ?? {}

    if (
      !date ||
      [weightKg, chestCm, waistCm, hipsCm, bicepCm, thighCm].some(
        (v) => typeof v !== 'number' || Number.isNaN(v)
      )
    ) {
      throw new HttpError(400, 'Заполните все числовые поля замера')
    }
    // Опциональные — есть только у тех, кто замерялся анализатором состава тела
    for (const v of [bodyFatPercent, skeletalMuscleMassKg]) {
      if (v !== undefined && v !== null && (typeof v !== 'number' || Number.isNaN(v))) {
        throw new HttpError(400, 'Некорректное значение % жира или мышечной массы')
      }
    }

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: req.userId!,
        date: new Date(date),
        weightKg,
        chestCm,
        waistCm,
        hipsCm,
        bicepCm,
        thighCm,
        bodyFatPercent: bodyFatPercent ?? null,
        skeletalMuscleMassKg: skeletalMuscleMassKg ?? null,
        notes: notes || null,
      },
    })
    res.status(201).json(measurement)
  })
)

export default router
