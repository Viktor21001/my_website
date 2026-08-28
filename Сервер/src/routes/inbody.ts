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
    const results = await prisma.inBodyResult.findMany({
      where: { userId: req.userId! },
      orderBy: { date: 'desc' },
    })
    res.json(results)
  })
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      date,
      weightKg,
      bodyFatPercent,
      skeletalMuscleMassKg,
      muscleMassKg,
      bodyWaterPercent,
      bmi,
      visceralFatLevel,
      basalMetabolicRateKcal,
    } = req.body ?? {}

    const numericFields = [
      weightKg,
      bodyFatPercent,
      skeletalMuscleMassKg,
      muscleMassKg,
      bodyWaterPercent,
      bmi,
      visceralFatLevel,
      basalMetabolicRateKcal,
    ]
    if (!date || numericFields.some((v) => typeof v !== 'number' || Number.isNaN(v))) {
      throw new HttpError(400, 'Заполните все числовые поля InBody-скана')
    }

    const result = await prisma.inBodyResult.create({
      data: {
        userId: req.userId!,
        date: new Date(date),
        weightKg,
        bodyFatPercent,
        skeletalMuscleMassKg,
        muscleMassKg,
        bodyWaterPercent,
        bmi,
        visceralFatLevel,
        basalMetabolicRateKcal,
      },
    })
    res.status(201).json(result)
  })
)

export default router
