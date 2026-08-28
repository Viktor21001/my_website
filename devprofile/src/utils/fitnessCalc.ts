/*
  fitnessCalc.ts — маленькие чистые функции, общие для
  useFitnessBadges и useFitnessRating (чтобы не дублировать
  подсчёт стрика и сортировку по дате в двух хуках).
*/

export function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/*
  longestDailyStreak — максимальная цепочка подряд идущих
  календарных дней среди переданных дат (без исключения выходных,
  в отличие от checkDiscipline для GitHub-коммитов).
*/
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
