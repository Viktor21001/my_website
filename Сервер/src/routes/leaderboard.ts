import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { toDbAgeGroup } from '../lib/ageGroup'
import { computeRating } from '../lib/rating'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ageGroupParam = req.query.ageGroup
    if (typeof ageGroupParam !== 'string') {
      throw new HttpError(400, 'Укажите ageGroup')
    }
    const dbAgeGroup = toDbAgeGroup(ageGroupParam)
    if (!dbAgeGroup) {
      throw new HttpError(400, 'Некорректная возрастная группа')
    }

    const users = await prisma.user.findMany({
      where: { ageGroup: dbAgeGroup },
      include: {
        workouts: { select: { date: true } },
        measurements: { select: { date: true, waistCm: true } },
        inbodyResults: { select: { date: true, bodyFatPercent: true, muscleMassKg: true } },
      },
    })

    const scored = users.map((user) => {
      const rating = computeRating({
        userId: user.id,
        workoutDates: user.workouts.map((w) => w.date.toISOString()),
        workoutsCount: user.workouts.length,
        measurements: user.measurements.map((m) => ({
          date: m.date.toISOString(),
          waistCm: m.waistCm,
        })),
        inbodyResults: user.inbodyResults.map((r) => ({
          date: r.date.toISOString(),
          bodyFatPercent: r.bodyFatPercent,
          muscleMassKg: r.muscleMassKg,
        })),
      })
      return { user, rating }
    })

    scored.sort((a, b) => b.rating.totalScore - a.rating.totalScore)

    const leaderboard = scored.map(({ user, rating }, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.displayName,
      avatar: user.avatar ?? '',
      ageGroup: ageGroupParam,
      activityScore: rating.activityScore,
      bodyProgressScore: rating.bodyProgressScore,
      achievementScore: rating.achievementScore,
      totalScore: rating.totalScore,
      level: rating.level,
      isCurrentUser: user.id === req.userId,
    }))

    res.json(leaderboard)
  })
)

export default router
