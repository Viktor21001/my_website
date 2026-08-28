/*
  rating.ts — серверная копия формулы из devprofile\src\hooks\useFitnessRating.ts
  и devprofile\src\hooks\useFitnessBadges.ts. Нужна отдельно от клиента, потому что
  лидерборд считает счёт СРАЗУ для всех пользователей возрастной группы —
  клиентский хук умеет считать только «для себя» из уже загруженных в браузер данных.

  Почему только 9 из 11 бейджей участвуют в achievementScore (см. FITNESS_BADGE_CONFIG
  на клиенте — те же 11 id):
  top3_leaderboard зависит от места в рейтинге, место — от totalScore, totalScore —
  от achievementScore, который включал бы top3_leaderboard. Цикл. Аналогично level_10
  зависит от level, который сам считается из achievementScore. Разрываем цикл —
  оба этих бейджа НЕ входят в очки ранжирования, они чисто отображаемые (значок
  разблокирован/нет), их наличие проверяется отдельно, уже после того как ранг
  и totalScore финальны.
*/

const XP_PER_LEVEL = 100
const XP_MULTIPLIER = 5

function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL))
}

// Идентичен devprofile\src\utils\fitnessCalc.ts
export function longestDailyStreak(dates: string[]): number {
  const uniqueDays = [...new Set(dates.map((d) => d.slice(0, 10)))].sort().reverse()
  if (uniqueDays.length === 0) return 0

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const current = new Date(uniqueDays[i])
    const diffDays = (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export interface RatingInput {
  userId: string
  workoutDates: string[]
  workoutsCount: number
  measurements: { date: string; waistCm: number }[]
  inbodyResults: { date: string; bodyFatPercent: number; muscleMassKg: number }[]
}

export interface RatingOutput {
  userId: string
  activityScore: number
  bodyProgressScore: number
  achievementScore: number
  totalScore: number
  level: number
  xp: number
  /* Отображаемые бейджи-исключения — не влияют на очки, см. комментарий выше */
  hasTop3Badge: boolean
  hasLevel10Badge: boolean
}

/*
  coreBadgeCount — те же 9 условий, что и на клиенте, кроме top3_leaderboard
  и level_10 (см. объяснение в шапке файла).
*/
function coreBadgeCount(input: RatingInput): number {
  let count = 0

  if (input.workoutsCount >= 1) count++

  const streakDays = longestDailyStreak(input.workoutDates)
  if (streakDays >= 7) count++
  if (streakDays >= 30) count++

  if (input.measurements.length >= 5) count++
  if (input.inbodyResults.length >= 1) count++

  if (input.inbodyResults.length >= 2) {
    const sorted = sortByDateAsc(input.inbodyResults)
    const first = sorted[0]
    const latest = sorted[sorted.length - 1]

    if (first.bodyFatPercent - latest.bodyFatPercent >= 5) count++
    if (latest.muscleMassKg - first.muscleMassKg >= 2) count++
  }

  if (input.workoutsCount >= 50) count++
  if (input.workoutsCount >= 100) count++

  return count
}

export function computeRating(input: RatingInput): RatingOutput {
  const streakDays = longestDailyStreak(input.workoutDates)
  const activityScore = Math.min(100, input.workoutsCount * 4 + streakDays * 3)

  let bodyProgressScore = 0
  if (input.measurements.length >= 2) {
    const sorted = sortByDateAsc(input.measurements)
    const waistDelta = sorted[0].waistCm - sorted[sorted.length - 1].waistCm
    bodyProgressScore += Math.max(0, waistDelta) * 3
  }
  if (input.inbodyResults.length >= 2) {
    const sorted = sortByDateAsc(input.inbodyResults)
    const first = sorted[0]
    const latest = sorted[sorted.length - 1]
    const fatLossDelta = first.bodyFatPercent - latest.bodyFatPercent
    const muscleGainDelta = latest.muscleMassKg - first.muscleMassKg
    bodyProgressScore += Math.max(0, fatLossDelta) * 4 + Math.max(0, muscleGainDelta) * 8
  }
  bodyProgressScore = Math.min(100, Math.round(bodyProgressScore))

  const badgeCount = coreBadgeCount(input)
  const achievementScore = Math.min(100, badgeCount * 10)

  const totalScore = Math.round(activityScore + bodyProgressScore + achievementScore)
  const xp = totalScore * XP_MULTIPLIER
  const level = levelFromXp(xp)

  return {
    userId: input.userId,
    activityScore,
    bodyProgressScore,
    achievementScore,
    totalScore,
    level,
    xp,
    hasTop3Badge: false, // проставляется вызывающим кодом после сортировки/ранжирования
    hasLevel10Badge: level >= 10,
  }
}
