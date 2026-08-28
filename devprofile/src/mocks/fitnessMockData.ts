/*
  fitnessMockData.ts — моковый корпус данных фитнес-раздела.

  В отличие от profileSlice (где MOCK_USER лежит прямо в слайсе) этот
  корпус вынесен в отдельный файл — данных заметно больше (тренировки,
  замеры, упражнения, лидерборд), инлайнить их в слайс было бы неудобно.

  Даты считаем относительно текущего момента (Date.now()), чтобы данные
  всегда выглядели «свежими» независимо от того, когда открыт сайт.
*/

import type {
  BodyMeasurement,
  InBodyResult,
  Exercise,
  Workout,
  LeaderboardEntry,
} from '../types/fitness'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── Упражнения ────────────────────────────────────────────────────
export const MOCK_EXERCISES: Exercise[] = [
  { id: 'ex1',  name: 'Жим штанги лёжа',        muscleGroup: 'chest',     equipment: 'Штанга' },
  { id: 'ex2',  name: 'Жим гантелей на наклонной', muscleGroup: 'chest',  equipment: 'Гантели' },
  { id: 'ex3',  name: 'Отжимания на брусьях',    muscleGroup: 'chest',     equipment: 'Брусья' },
  { id: 'ex4',  name: 'Становая тяга',           muscleGroup: 'back',      equipment: 'Штанга' },
  { id: 'ex5',  name: 'Подтягивания',            muscleGroup: 'back',      equipment: 'Турник' },
  { id: 'ex6',  name: 'Тяга штанги в наклоне',   muscleGroup: 'back',      equipment: 'Штанга' },
  { id: 'ex7',  name: 'Приседания со штангой',   muscleGroup: 'legs',      equipment: 'Штанга' },
  { id: 'ex8',  name: 'Жим ногами',              muscleGroup: 'legs',      equipment: 'Тренажёр' },
  { id: 'ex9',  name: 'Выпады с гантелями',      muscleGroup: 'legs',      equipment: 'Гантели' },
  { id: 'ex10', name: 'Жим штанги стоя',         muscleGroup: 'shoulders', equipment: 'Штанга' },
  { id: 'ex11', name: 'Махи гантелями в стороны',muscleGroup: 'shoulders',equipment: 'Гантели' },
  { id: 'ex12', name: 'Подъём штанги на бицепс', muscleGroup: 'arms',      equipment: 'Штанга' },
  { id: 'ex13', name: 'Французский жим',         muscleGroup: 'arms',      equipment: 'Гантели' },
  { id: 'ex14', name: 'Скручивания на пресс',    muscleGroup: 'core',      equipment: 'Коврик' },
  { id: 'ex15', name: 'Бег на дорожке',          muscleGroup: 'cardio',    equipment: 'Дорожка' },
]

const ex = (id: string) => MOCK_EXERCISES.find((e) => e.id === id)!

// ─── Тренировки (6 недель, 3-4 раза в неделю) ─────────────────────
export const MOCK_WORKOUTS: Workout[] = [
  {
    id: 'w1', date: daysAgo(1), title: 'Грудь и трицепс', durationMin: 58,
    sets: [
      { exerciseId: 'ex1', exerciseName: ex('ex1').name, setNumber: 1, reps: 8, weightKg: 70 },
      { exerciseId: 'ex1', exerciseName: ex('ex1').name, setNumber: 2, reps: 8, weightKg: 72.5 },
      { exerciseId: 'ex1', exerciseName: ex('ex1').name, setNumber: 3, reps: 6, weightKg: 75 },
      { exerciseId: 'ex13', exerciseName: ex('ex13').name, setNumber: 1, reps: 12, weightKg: 14 },
      { exerciseId: 'ex13', exerciseName: ex('ex13').name, setNumber: 2, reps: 10, weightKg: 16 },
    ],
  },
  {
    id: 'w2', date: daysAgo(3), title: 'Спина и бицепс', durationMin: 62,
    sets: [
      { exerciseId: 'ex4', exerciseName: ex('ex4').name, setNumber: 1, reps: 5, weightKg: 100 },
      { exerciseId: 'ex4', exerciseName: ex('ex4').name, setNumber: 2, reps: 5, weightKg: 105 },
      { exerciseId: 'ex5', exerciseName: ex('ex5').name, setNumber: 1, reps: 10, weightKg: 0 },
      { exerciseId: 'ex12', exerciseName: ex('ex12').name, setNumber: 1, reps: 10, weightKg: 30 },
    ],
  },
  {
    id: 'w3', date: daysAgo(5), title: 'Ноги', durationMin: 65,
    sets: [
      { exerciseId: 'ex7', exerciseName: ex('ex7').name, setNumber: 1, reps: 8, weightKg: 90 },
      { exerciseId: 'ex7', exerciseName: ex('ex7').name, setNumber: 2, reps: 8, weightKg: 95 },
      { exerciseId: 'ex9', exerciseName: ex('ex9').name, setNumber: 1, reps: 12, weightKg: 18 },
    ],
  },
  { id: 'w4', date: daysAgo(8),  title: 'Плечи и пресс', durationMin: 50, sets: [
    { exerciseId: 'ex10', exerciseName: ex('ex10').name, setNumber: 1, reps: 8, weightKg: 40 },
    { exerciseId: 'ex11', exerciseName: ex('ex11').name, setNumber: 1, reps: 15, weightKg: 8 },
    { exerciseId: 'ex14', exerciseName: ex('ex14').name, setNumber: 1, reps: 20, weightKg: 0 },
  ]},
  { id: 'w5', date: daysAgo(10), title: 'Грудь и трицепс', durationMin: 55, sets: [
    { exerciseId: 'ex2', exerciseName: ex('ex2').name, setNumber: 1, reps: 10, weightKg: 24 },
    { exerciseId: 'ex3', exerciseName: ex('ex3').name, setNumber: 1, reps: 10, weightKg: 0 },
  ]},
  { id: 'w6', date: daysAgo(12), title: 'Кардио', durationMin: 35, sets: [
    { exerciseId: 'ex15', exerciseName: ex('ex15').name, setNumber: 1, reps: 1, weightKg: 0 },
  ]},
  { id: 'w7', date: daysAgo(15), title: 'Спина и бицепс', durationMin: 60, sets: [
    { exerciseId: 'ex6', exerciseName: ex('ex6').name, setNumber: 1, reps: 10, weightKg: 60 },
    { exerciseId: 'ex5', exerciseName: ex('ex5').name, setNumber: 1, reps: 8, weightKg: 0 },
  ]},
  { id: 'w8', date: daysAgo(17), title: 'Ноги', durationMin: 63, sets: [
    { exerciseId: 'ex7', exerciseName: ex('ex7').name, setNumber: 1, reps: 8, weightKg: 85 },
    { exerciseId: 'ex8', exerciseName: ex('ex8').name, setNumber: 1, reps: 12, weightKg: 120 },
  ]},
  { id: 'w9', date: daysAgo(19), title: 'Грудь и плечи', durationMin: 57, sets: [
    { exerciseId: 'ex1', exerciseName: ex('ex1').name, setNumber: 1, reps: 8, weightKg: 67.5 },
    { exerciseId: 'ex10', exerciseName: ex('ex10').name, setNumber: 1, reps: 8, weightKg: 37.5 },
  ]},
  { id: 'w10', date: daysAgo(22), title: 'Спина', durationMin: 52, sets: [
    { exerciseId: 'ex4', exerciseName: ex('ex4').name, setNumber: 1, reps: 5, weightKg: 95 },
  ]},
  { id: 'w11', date: daysAgo(26), title: 'Ноги и пресс', durationMin: 58, sets: [
    { exerciseId: 'ex7', exerciseName: ex('ex7').name, setNumber: 1, reps: 8, weightKg: 80 },
    { exerciseId: 'ex14', exerciseName: ex('ex14').name, setNumber: 1, reps: 20, weightKg: 0 },
  ]},
  { id: 'w12', date: daysAgo(29), title: 'Грудь и трицепс', durationMin: 54, sets: [
    { exerciseId: 'ex1', exerciseName: ex('ex1').name, setNumber: 1, reps: 8, weightKg: 65 },
  ]},
  { id: 'w13', date: daysAgo(33), title: 'Кардио', durationMin: 30, sets: [
    { exerciseId: 'ex15', exerciseName: ex('ex15').name, setNumber: 1, reps: 1, weightKg: 0 },
  ]},
  { id: 'w14', date: daysAgo(36), title: 'Спина и бицепс', durationMin: 59, sets: [
    { exerciseId: 'ex4', exerciseName: ex('ex4').name, setNumber: 1, reps: 5, weightKg: 90 },
  ]},
]

// ─── Замеры тела (снижается талия, растёт бицепс — виден прогресс) ─
export const MOCK_MEASUREMENTS: BodyMeasurement[] = [
  { id: 'm1', date: daysAgo(1),   weightKg: 78.4, chestCm: 102, waistCm: 82.5, hipsCm: 98,  bicepCm: 37.8, thighCm: 58.5 },
  { id: 'm2', date: daysAgo(15),  weightKg: 78.9, chestCm: 101.5, waistCm: 83.2, hipsCm: 98.2, bicepCm: 37.4, thighCm: 58.2 },
  { id: 'm3', date: daysAgo(30),  weightKg: 79.5, chestCm: 100.8, waistCm: 84.1, hipsCm: 98.5, bicepCm: 37, thighCm: 58 },
  { id: 'm4', date: daysAgo(45),  weightKg: 80.1, chestCm: 100, waistCm: 85, hipsCm: 99,  bicepCm: 36.5, thighCm: 57.6 },
  { id: 'm5', date: daysAgo(62),  weightKg: 80.8, chestCm: 99.2, waistCm: 86.3, hipsCm: 99.3, bicepCm: 36, thighCm: 57.2 },
  { id: 'm6', date: daysAgo(80),  weightKg: 81.6, chestCm: 98.5, waistCm: 87.5, hipsCm: 99.8, bicepCm: 35.6, thighCm: 56.9 },
]

// ─── InBody-сканы (жир снижается, мышечная масса растёт) ──────────
export const MOCK_INBODY_RESULTS: InBodyResult[] = [
  { id: 'ib1', date: daysAgo(2),  weightKg: 78.4, bodyFatPercent: 16.8, skeletalMuscleMassKg: 36.9, muscleMassKg: 62.1, bodyWaterPercent: 58.4, bmi: 23.4, visceralFatLevel: 6, basalMetabolicRateKcal: 1780 },
  { id: 'ib2', date: daysAgo(35), weightKg: 79.9, bodyFatPercent: 18.1, skeletalMuscleMassKg: 36.1, muscleMassKg: 60.9, bodyWaterPercent: 57.6, bmi: 23.9, visceralFatLevel: 7, basalMetabolicRateKcal: 1745 },
  { id: 'ib3', date: daysAgo(80), weightKg: 81.6, bodyFatPercent: 19.6, skeletalMuscleMassKg: 35.4, muscleMassKg: 59.8, bodyWaterPercent: 56.9, bmi: 24.4, visceralFatLevel: 8, basalMetabolicRateKcal: 1712 },
]

// ─── Лидерборд по возрастным группам (моки конкурентов) ───────────
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', name: 'ironmaxx',      avatar: 'https://i.pravatar.cc/64?img=12', ageGroup: '25-30', activityScore: 94, bodyProgressScore: 88, achievementScore: 90, totalScore: 272, level: 14 },
  { rank: 2, userId: 'u2', name: 'sanya_fit',     avatar: 'https://i.pravatar.cc/64?img=33', ageGroup: '25-30', activityScore: 90, bodyProgressScore: 85, achievementScore: 82, totalScore: 257, level: 12 },
  { rank: 3, userId: 'self', name: 'Yeliseyev',   avatar: 'https://avatars.githubusercontent.com/u/583231?v=4', ageGroup: '25-30', activityScore: 82, bodyProgressScore: 79, achievementScore: 70, totalScore: 231, level: 9, isCurrentUser: true },
  { rank: 4, userId: 'u3', name: 'kostya_gym',    avatar: 'https://i.pravatar.cc/64?img=15', ageGroup: '25-30', activityScore: 75, bodyProgressScore: 70, achievementScore: 68, totalScore: 213, level: 8 },
  { rank: 5, userId: 'u4', name: 'lifter_dan',    avatar: 'https://i.pravatar.cc/64?img=51', ageGroup: '25-30', activityScore: 68, bodyProgressScore: 66, achievementScore: 60, totalScore: 194, level: 7 },
  { rank: 6, userId: 'u5', name: 'progress_egor', avatar: 'https://i.pravatar.cc/64?img=22', ageGroup: '25-30', activityScore: 60, bodyProgressScore: 58, achievementScore: 50, totalScore: 168, level: 6 },
  { rank: 1, userId: 'u6', name: 'young_gains',   avatar: 'https://i.pravatar.cc/64?img=8',  ageGroup: '20-25', activityScore: 88, bodyProgressScore: 80, achievementScore: 75, totalScore: 243, level: 11 },
  { rank: 2, userId: 'u7', name: 'nastya_run',    avatar: 'https://i.pravatar.cc/64?img=47', ageGroup: '20-25', activityScore: 80, bodyProgressScore: 76, achievementScore: 70, totalScore: 226, level: 10 },
  { rank: 3, userId: 'u8', name: 'denis_25',      avatar: 'https://i.pravatar.cc/64?img=17', ageGroup: '20-25', activityScore: 70, bodyProgressScore: 65, achievementScore: 55, totalScore: 190, level: 8 },
  { rank: 1, userId: 'u9', name: 'oldschool_pro', avatar: 'https://i.pravatar.cc/64?img=60', ageGroup: '30-35', activityScore: 85, bodyProgressScore: 90, achievementScore: 88, totalScore: 263, level: 13 },
  { rank: 2, userId: 'u10', name: 'masha_forma',  avatar: 'https://i.pravatar.cc/64?img=44', ageGroup: '30-35', activityScore: 78, bodyProgressScore: 82, achievementScore: 72, totalScore: 232, level: 11 },
  { rank: 3, userId: 'u11', name: 'vlad_35',      avatar: 'https://i.pravatar.cc/64?img=25', ageGroup: '30-35', activityScore: 65, bodyProgressScore: 68, achievementScore: 58, totalScore: 191, level: 8 },
]

// Возрастная группа текущего (мокового) пользователя — используется как
// группа по умолчанию в переключателе AgeGroupLeaderboard
export const CURRENT_USER_AGE_GROUP = '25-30' as const
