import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { asyncHandler } from '../lib/asyncHandler'

const router = Router()

// Каталог общий для всех — авторизация не нужна
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } })
    res.json(exercises)
  })
)

export default router
