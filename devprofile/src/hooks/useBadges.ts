/*
  useBadges — главный хук который считает все бейджи.
  
  Запускается один раз при загрузке страницы.
  Читает данные из GitHub и Steam API (через RTK Query кеш —
  запросы уже сделаны другими компонентами, повторных fetch не будет).
  Вычисляет какие бейджи разблокированы.
  Записывает в Redux store через dispatch(setBadges()).
  
  Почему useEffect + dispatch а не прямо в компоненте?
  Бейджи нужны в нескольких местах (BadgesRow, ProfileHeader уровень).
  Считаем один раз — храним в store — читают все кому нужно.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { setBadges, setLevel } from '../store/slices/profileSlice'
import { useGetRecentReposQuery, useGetEventsQuery, useGetProfileQuery } from '../store/api/githubApi'
import { useGetOwnedGamesQuery } from '../store/api/steamApi'
import { makeBadge } from '../config/badges'
import type { Badge } from '../types/profile'
import { XP_PER_LEVEL } from '../config/constants'

export function useBadges() {
  const dispatch = useAppDispatch()

  const githubUsername = useAppSelector((state) => state.auth.user?.githubUsername ?? '')
  const steamId = useAppSelector((state) => state.auth.user?.steamId ?? '')

  /*
    Все данные уже закешированы RTK Query из других компонентов.
    Здесь мы просто читаем кеш — новых сетевых запросов нет.
    skip: !username — не запускаем если нет логина.
  */
  const { data: repos   } = useGetRecentReposQuery(githubUsername, { skip: !githubUsername })
  const { data: events  } = useGetEventsQuery(githubUsername,      { skip: !githubUsername })
  const { data: profile } = useGetProfileQuery(githubUsername,     { skip: !githubUsername })
  // Вся библиотека, а не топ-4 "любимых" — иначе Геймер/Хардкор считались
  // по заниженному суммарному времени, если у аккаунта больше 4 игр
  const { data: games   } = useGetOwnedGamesQuery(steamId,         { skip: !steamId })

  useEffect(() => {
    /*
      Ждём пока все данные загрузятся.
      Если какого-то API нет (например Steam не настроен) —
      считаем только то что доступно.
    */
    if (!repos && !events && !profile && !games) return

    const unlocked: Badge[] = []

    // ── Бейдж: Основатель ─────────────────────────────────────────
    /*
      Захардкожен — выдаём всегда.
      В будущем когда будет мультипользовательская платформа —
      проверять по user.id === FOUNDER_ID.
    */
    unlocked.push(makeBadge('founder'))

    // ── Бейджи: Ветеран ───────────────────────────────────────────
    if (profile) {
      /*
        Считаем сколько дней прошло с регистрации на GitHub.
        createdAt приходит как ISO строка: "2019-03-15T10:00:00Z"
      */
      const accountAgeDays =
        (Date.now() - new Date(profile.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)

      if (accountAgeDays >= 365)         unlocked.push(makeBadge('veteran_1y'))
      if (accountAgeDays >= 365 * 3)     unlocked.push(makeBadge('veteran_3y'))
      if (accountAgeDays >= 365 * 5)     unlocked.push(makeBadge('veteran_5y'))
    }

    // ── Бейджи: Опенсорс и Популярный ────────────────────────────
    if (repos && repos.length > 0) {
      const totalStars = repos.reduce((sum, r) => sum + r.stars, 0)

      if (totalStars >= 1)  unlocked.push(makeBadge('opensource'))
      if (totalStars >= 10) unlocked.push(makeBadge('popular'))

      // ── Бейдж: Полиглот ───────────────────────────────────────
      /*
        Собираем уникальные языки по всем репозиториям.
        repo.language — основной язык (строка или null).
        Фильтруем null и считаем уникальные.
      */
      const uniqueLangs = new Set(
        repos
          .map((r) => r.language)
          .filter((l): l is string => l !== null)
      )

      if (uniqueLangs.size >= 5) {
        unlocked.push(makeBadge('polyglot'))
      }
    }

    // ── Бейджи: Контрибьютор и Дисциплина ────────────────────────
    if (events && events.length > 0) {

      // Контрибьютор — есть хотя бы один PR
      const hasPR = events.some((e) => e.type === 'PullRequestEvent')
      if (hasPR) unlocked.push(makeBadge('contributor'))

      // Дисциплина — коммиты 30 будних дней подряд
      const disciplineBadge = checkDiscipline(events.map((e) => e.createdAt))
      if (disciplineBadge) unlocked.push(disciplineBadge)
    }

    // ── Бейджи: Геймер и Хардкор ──────────────────────────────────
    if (games && games.length > 0) {
      /*
        Суммируем playtimeForever по всем играм.
        Steam хранит время в минутах.
        100 часов = 6000 минут, 1000 часов = 60000 минут.
      */
      const totalMinutes = games.reduce(
        (sum, g) => sum + g.playtimeForever, 0
      )

      if (totalMinutes >= 6000)  unlocked.push(makeBadge('gamer'))
      if (totalMinutes >= 60000) unlocked.push(makeBadge('hardcore'))
    }

    // ── Обновляем store ───────────────────────────────────────────
    dispatch(setBadges(unlocked))

    /*
      Считаем XP и уровень на основе достижений.
      
      Формула XP:
      +10 за каждый разблокированный бейдж
      +1  за каждую звезду на репо (до 50)
      +1  за каждые 10 часов в Steam (до 100)
      
      Это даёт уровни от 1 до ~30 для активного разработчика.
    */
    const badgeXp  = unlocked.length * 10
    const starXp   = Math.min(
      repos?.reduce((s, r) => s + r.stars, 0) ?? 0,
      50
    )
    const steamXp  = Math.min(
      Math.floor(
        (games?.reduce((s, g) => s + g.playtimeForever, 0) ?? 0) / 600
      ),
      100
    )

    const totalXp = badgeXp + starXp + steamXp
    const level   = Math.max(1, Math.floor(totalXp / XP_PER_LEVEL))

    dispatch(setLevel({ level, xp: totalXp }))

  /*
    Зависимости useEffect — пересчитываем когда меняются данные.
    dispatch стабилен — не вызывает лишних перерендеров.
  */
  }, [repos, events, profile, games, dispatch])
}

/*
  checkDiscipline — проверяем 30 будних дней подряд с коммитами.
  
  Алгоритм:
  1. Берём даты всех PushEvent
  2. Оставляем только будние дни (пн-пт)
  3. Убираем дубли — оставляем уникальные даты
  4. Сортируем по убыванию (свежие первые)
  5. Считаем максимальную непрерывную цепочку последовательных дней
  
  Возвращает Badge если условие выполнено, иначе null.
*/
function checkDiscipline(eventDates: string[]): Badge | null {
  // Извлекаем только даты PushEvent в формате "YYYY-MM-DD"
  const workDays = eventDates
    .map((d) => {
      const date = new Date(d)
      const day  = date.getDay() // 0=вс, 1=пн, ..., 5=пт, 6=сб
      // Оставляем только будние дни
      if (day === 0 || day === 6) return null
      // Возвращаем дату как строку без времени
      return date.toISOString().split('T')[0]
    })
    .filter((d): d is string => d !== null)

  // Убираем дублирующиеся даты (несколько коммитов в один день = один день)
  const uniqueDays = [...new Set(workDays)].sort().reverse()

  if (uniqueDays.length === 0) return null

  // Считаем максимальную цепочку последовательных дней
  let maxStreak     = 1
  let currentStreak = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev    = new Date(uniqueDays[i - 1])
    const current = new Date(uniqueDays[i])

    /*
      Разница между соседними датами.
      Если 1 день — продолжаем цепочку.
      Если больше — сбрасываем.
      Но пропускаем выходные: пятница → понедельник = 3 дня разницы,
      но это всё равно непрерывная будняя цепочка.
    */
    const diffDays =
      (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)

    const isWeekendGap =
      prev.getDay() === 1 && // понедельник
      current.getDay() === 5 && // предыдущий день — пятница
      diffDays === 3

    if (diffDays === 1 || isWeekendGap) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  if (maxStreak >= 30) {
    return makeBadge('discipline')
  }

  /*
    Если ещё не 30 — возвращаем null но добавляем прогресс.
    Прогресс показываем в тултипе бейджа в BadgesRow.
    Пока просто null — прогресс добавим в следующей итерации.
  */
  return null
}