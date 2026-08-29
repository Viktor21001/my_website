/*
  seed.ts — наполняет БД:
  1) общий каталог упражнений (те же id/названия, что в старом
     devprofile\src\mocks\fitnessMockData.ts, чтобы ничего не «поплыло»
     визуально после перехода с моков на реальный API)
  2) боты-конкуренты для лидерборда — реальные User с реальными
     workouts/measurements/inbodyResults, чтобы computeRating() считал
     их счёт по той же формуле, что и для настоящих пользователей,
     а не хардкодил число. Данные генерируются детерминированно
     (без Math.random) по «тиру» — один и тот же запуск сида всегда
     даёт один и тот же результат.

  Скрипт идемпотентен: упражнения — upsert по id, данные ботов
  перед вставкой удаляются и создаются заново.
*/

import { PrismaClient, MuscleGroup, ExperienceLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { CLIENT_TO_AGE_GROUP, type ClientAgeGroup } from '../src/lib/ageGroup'

const prisma = new PrismaClient()

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/*
  Упражнения — теперь ещё и с тегами для конструктора тренировок
  (WorkoutBuilder, devprofile\src\utils\workoutGenerator.ts):
    homeFriendly   — выполнимо дома одним весом тела, без зального оборудования
    compound       — базовое многосуставное упражнение (присед/тяга/жим)
    minLevel       — минимальный уровень подготовки, с которого оно уместно
    bodyweightOnly — вес не вводится руками, в подходе используется вес тела
                     (см. devprofile\src\utils\workoutWeights.ts) — true для
                     всего, что не делается со штангой/гантелями/на тренажёре
    isTimeBased    — WorkoutSet.reps хранит минуты, а не повторы (планка,
                     бег, велотренажёр, эллипсоид, скакалка)

  ex1..ex15 — исходный каталог (id сохранены, чтобы не потерять связи
  с уже существующими WorkoutSet у ботов и реальных пользователей).
  ex16..ex28 — новые: домашние упражнения с собственным весом, кардио
  для ВИИТ/дома, пара доп. тренажёров и отдельная запись «Плавание»
  (изолированная сущность — ищется по имени, не по id; bodyweightOnly/
  isTimeBased у неё не используются, т.к. плавание не участвует в этой
  логике вовсе — см. workoutGenerator.ts/buildSwimmingWorkout).
*/
const EXERCISES: {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: string
  homeFriendly: boolean
  compound: boolean
  minLevel: ExperienceLevel
  bodyweightOnly: boolean
  isTimeBased: boolean
}[] = [
  { id: 'ex1', name: 'Жим штанги лёжа', muscleGroup: MuscleGroup.chest, equipment: 'Штанга', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex2', name: 'Жим гантелей на наклонной', muscleGroup: MuscleGroup.chest, equipment: 'Гантели', homeFriendly: false, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex3', name: 'Отжимания на брусьях', muscleGroup: MuscleGroup.chest, equipment: 'Брусья', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex4', name: 'Становая тяга', muscleGroup: MuscleGroup.back, equipment: 'Штанга', homeFriendly: false, compound: true, minLevel: ExperienceLevel.advanced, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex5', name: 'Подтягивания', muscleGroup: MuscleGroup.back, equipment: 'Турник', homeFriendly: true, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex6', name: 'Тяга штанги в наклоне', muscleGroup: MuscleGroup.back, equipment: 'Штанга', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex7', name: 'Приседания со штангой', muscleGroup: MuscleGroup.legs, equipment: 'Штанга', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex8', name: 'Жим ногами', muscleGroup: MuscleGroup.legs, equipment: 'Тренажёр', homeFriendly: false, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex9', name: 'Выпады с гантелями', muscleGroup: MuscleGroup.legs, equipment: 'Гантели', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex10', name: 'Жим штанги стоя', muscleGroup: MuscleGroup.shoulders, equipment: 'Штанга', homeFriendly: false, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex11', name: 'Махи гантелями в стороны', muscleGroup: MuscleGroup.shoulders, equipment: 'Гантели', homeFriendly: false, compound: false, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex12', name: 'Подъём штанги на бицепс', muscleGroup: MuscleGroup.arms, equipment: 'Штанга', homeFriendly: false, compound: false, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex13', name: 'Французский жим', muscleGroup: MuscleGroup.arms, equipment: 'Гантели', homeFriendly: false, compound: false, minLevel: ExperienceLevel.intermediate, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex14', name: 'Скручивания на пресс', muscleGroup: MuscleGroup.core, equipment: 'Коврик', homeFriendly: true, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex15', name: 'Бег на дорожке', muscleGroup: MuscleGroup.cardio, equipment: 'Дорожка', homeFriendly: false, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: true },
  { id: 'ex16', name: 'Отжимания', muscleGroup: MuscleGroup.chest, homeFriendly: true, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex17', name: 'Приседания без веса', muscleGroup: MuscleGroup.legs, homeFriendly: true, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex18', name: 'Планка', muscleGroup: MuscleGroup.core, equipment: 'Коврик', homeFriendly: true, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: true },
  { id: 'ex19', name: 'Выпады без веса', muscleGroup: MuscleGroup.legs, homeFriendly: true, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex20', name: 'Ягодичный мостик', muscleGroup: MuscleGroup.legs, equipment: 'Коврик', homeFriendly: true, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex21', name: 'Супермен (гиперэкстензия лёжа)', muscleGroup: MuscleGroup.back, equipment: 'Коврик', homeFriendly: true, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex22', name: 'Бёрпи', muscleGroup: MuscleGroup.cardio, homeFriendly: true, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex23', name: 'Прыжки на скакалке', muscleGroup: MuscleGroup.cardio, equipment: 'Скакалка', homeFriendly: true, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: true },
  { id: 'ex24', name: 'Приседания с выпрыгиванием', muscleGroup: MuscleGroup.cardio, homeFriendly: true, compound: true, minLevel: ExperienceLevel.intermediate, bodyweightOnly: true, isTimeBased: false },
  { id: 'ex25', name: 'Велотренажёр', muscleGroup: MuscleGroup.cardio, equipment: 'Велотренажёр', homeFriendly: false, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: true },
  { id: 'ex26', name: 'Эллипсоид', muscleGroup: MuscleGroup.cardio, equipment: 'Эллипсоид', homeFriendly: false, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: true, isTimeBased: true },
  { id: 'ex27', name: 'Жим от груди в тренажёре', muscleGroup: MuscleGroup.chest, equipment: 'Тренажёр', homeFriendly: false, compound: true, minLevel: ExperienceLevel.beginner, bodyweightOnly: false, isTimeBased: false },
  { id: 'ex28', name: 'Плавание', muscleGroup: MuscleGroup.cardio, equipment: 'Бассейн', homeFriendly: false, compound: false, minLevel: ExperienceLevel.beginner, bodyweightOnly: false, isTimeBased: false },
]

// ─── Боты-конкуренты ────────────────────────────────────────────
interface BotSpec {
  username: string
  ageGroup: ClientAgeGroup
  tier: 1 | 2 | 3 | 4 | 5
}

const BOTS: BotSpec[] = [
  { username: 'ironmaxx', ageGroup: '26-30', tier: 1 },
  { username: 'sanya_fit', ageGroup: '26-30', tier: 2 },
  { username: 'kostya_gym', ageGroup: '26-30', tier: 3 },
  { username: 'lifter_dan', ageGroup: '26-30', tier: 4 },
  { username: 'progress_egor', ageGroup: '26-30', tier: 5 },
  { username: 'young_gains', ageGroup: '21-25', tier: 1 },
  { username: 'nastya_run', ageGroup: '21-25', tier: 2 },
  { username: 'denis_25', ageGroup: '21-25', tier: 3 },
  { username: 'oldschool_pro', ageGroup: '31-35', tier: 1 },
  { username: 'masha_forma', ageGroup: '31-35', tier: 2 },
  { username: 'vlad_35', ageGroup: '31-35', tier: 3 },
  { username: 'diana_yng', ageGroup: '16-20', tier: 3 },
  { username: 'sergey_38', ageGroup: '36-40', tier: 2 },
  { username: 'viktor_45', ageGroup: '41+', tier: 2 },
]

const TIER_PARAMS: Record<
  BotSpec['tier'],
  { workouts: number; waistDelta: number; fatLossDelta: number; muscleGainDelta: number }
> = {
  1: { workouts: 55, waistDelta: 8, fatLossDelta: 6, muscleGainDelta: 3 },
  2: { workouts: 32, waistDelta: 5, fatLossDelta: 4, muscleGainDelta: 2.2 },
  3: { workouts: 18, waistDelta: 3, fatLossDelta: 2.5, muscleGainDelta: 1.5 },
  4: { workouts: 10, waistDelta: 1.5, fatLossDelta: 1, muscleGainDelta: 0.8 },
  5: { workouts: 5, waistDelta: 0.5, fatLossDelta: 0.3, muscleGainDelta: 0.3 },
}

const MAIN_LIFTS = ['ex1', 'ex4', 'ex7']

async function seedExercises() {
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: ex,
      create: ex,
    })
  }
}

async function seedBot(spec: BotSpec) {
  const passwordHash = await bcrypt.hash('bot-account-no-login', 10)

  const user = await prisma.user.upsert({
    where: { username: spec.username },
    update: {},
    create: {
      email: `${spec.username}@bots.local`,
      username: spec.username,
      passwordHash,
      displayName: spec.username,
      ageGroup: CLIENT_TO_AGE_GROUP[spec.ageGroup],
    },
  })

  // Пересоздаём данные — так сид безопасно перезапускать
  await prisma.workout.deleteMany({ where: { userId: user.id } })
  await prisma.bodyMeasurement.deleteMany({ where: { userId: user.id } })
  await prisma.inBodyResult.deleteMany({ where: { userId: user.id } })

  const params = TIER_PARAMS[spec.tier]

  for (let i = 0; i < params.workouts; i++) {
    const exerciseId = MAIN_LIFTS[i % MAIN_LIFTS.length]
    await prisma.workout.create({
      data: {
        userId: user.id,
        date: daysAgo(i * 2),
        title: 'Тренировка',
        durationMin: 50 + (i % 3) * 5,
        sets: {
          create: [
            { exerciseId, setNumber: 1, reps: 8, weightKg: 40 + (i % 5) * 2 },
            { exerciseId, setNumber: 2, reps: 8, weightKg: 42 + (i % 5) * 2 },
          ],
        },
      },
    })
  }

  const spanDays = params.workouts * 2 + 10

  await prisma.bodyMeasurement.createMany({
    data: [
      {
        userId: user.id,
        date: daysAgo(spanDays),
        weightKg: 82,
        chestCm: 100,
        waistCm: 90,
        hipsCm: 100,
        bicepCm: 35,
        thighCm: 56,
      },
      {
        userId: user.id,
        date: daysAgo(1),
        weightKg: 82 - params.waistDelta * 0.3,
        chestCm: 101,
        waistCm: 90 - params.waistDelta,
        hipsCm: 99,
        bicepCm: 35.5,
        thighCm: 56.5,
      },
    ],
  })

  await prisma.inBodyResult.createMany({
    data: [
      {
        userId: user.id,
        date: daysAgo(spanDays - 2),
        weightKg: 82,
        bodyFatPercent: 20,
        skeletalMuscleMassKg: 35,
        muscleMassKg: 58,
        bodyWaterPercent: 56,
        bmi: 24,
        visceralFatLevel: 9,
        basalMetabolicRateKcal: 1700,
      },
      {
        userId: user.id,
        date: daysAgo(1),
        weightKg: 82 - params.waistDelta * 0.3,
        bodyFatPercent: 20 - params.fatLossDelta,
        skeletalMuscleMassKg: 36,
        muscleMassKg: 58 + params.muscleGainDelta,
        bodyWaterPercent: 57,
        bmi: 23,
        visceralFatLevel: 7,
        basalMetabolicRateKcal: 1750,
      },
    ],
  })
}

async function main() {
  await seedExercises()
  for (const bot of BOTS) {
    await seedBot(bot)
  }
  console.log(`Готово: ${EXERCISES.length} упражнений, ${BOTS.length} ботов.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
